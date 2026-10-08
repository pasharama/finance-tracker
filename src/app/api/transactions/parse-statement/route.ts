import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("screenshot") as File;

    if (!file) {
      return NextResponse.json({ error: "File screenshot tidak ditemukan" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";
    const apiKey = process.env.AI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json({ error: "AI_API_KEY kosong di .env" }, { status: 400 });
    }

    // Model tercepat & paling stabil untuk akun Anda
    const model = "gemini-3.5-flash-lite";

    const prompt = `Anda adalah parser mutasi perbankan Jepang (Chiba Bank / SMBC / Yucho).
Analisis teks dalam screenshot gambar ini baris per baris:
1. '入' (Merah) = INCOME (uang masuk).
   - Jika ada nama Katakana, jadikan type 'INCOME', description: 'Transfer Masuk dari: ' + nama katakana.
   - Jika 'AD' atau '入 AD' (Automatic Deposit), jadikan type 'TRANSFER', transferDirection: 'CASH_TO_BANK', description: 'Setor Tunai ATM (AD)'.
2. '出' (Biru) = EXPENSE (uang keluar).
   - Jika ada kata 'アプリ' diikuti nama katakana, jadikan type 'EXPENSE', description: 'Transfer Keluar ke: ' + nama katakana (hilangkan kata アプリ).
   - Jika 'VISAD', jadikan description: 'Debit Visa (' + kode yang tertera + ')'.
   - Jika 'CD' atau '出 CD' (Cash Dispenser), jadikan type 'TRANSFER', transferDirection: 'BANK_TO_CASH', description: 'Tarik Tunai ATM (CD)'.
3. Tanggal diformat ke YYYY-MM-DD. Nominal angka bulat murni tanpa karakter ¥ atau koma.

KEMBALIKAN HANYA JSON MURNI TANPA BLOK MARKDOWN:
{
  "bankName": "Nama Bank",
  "items": [
    {
      "type": "INCOME" | "EXPENSE" | "TRANSFER",
      "amount": number,
      "date": "YYYY-MM-DD",
      "description": "string",
      "rawLabel": "string label asli",
      "transferDirection": "BANK_TO_CASH" | "CASH_TO_BANK" | null
    }
  ]
}`;

    console.log(`[OCR] Memproses langsung dengan model instan: ${model}...`);
    const startTime = Date.now();

    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      }
    );

    if (!genRes.ok) {
      const errDetail = await genRes.text();
      throw new Error(`API Error: ${errDetail}`);
    }

    const genData = await genRes.json();
    let textOut = genData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    textOut = textOut.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(textOut);

    console.log(`[OCR] Selesai dalam ${Date.now() - startTime}ms`);
    return NextResponse.json({ success: true, ...parsed });

  } catch (error: any) {
    console.error("OCR Parse Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}