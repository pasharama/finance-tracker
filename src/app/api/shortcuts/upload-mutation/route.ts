import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BalanceEngine } from "@/features/ledger/balance-engine";
import { Prisma, TransactionType } from "@prisma/client";

// Helper OCR Statement Parser via Gemini / Vision
async function parseScreenshotWithGemini(fileBuffer: Buffer, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in .env");
  }

  const base64Data = fileBuffer.toString("base64");
  const prompt = `
Anda adalah AI parser screenshot rekening bank/m-banking Jepang (seperti Chiba Bank, SMBC, Yucho, MUFG) atau e-wallet (PayPay).
Ekstrak daftar mutasi transaksi yang tampak di gambar ini menjadi format JSON murni TANPA markdown formatting dan tanpa tanda kutip tiga (\`\`\`json).

Aturan JSON:
[
  {
    "type": "EXPENSE" | "INCOME",
    "amount": 1500,
    "description": "Nama Toko / Keterangan Transfer",
    "date": "YYYY-MM-DD"
  }
]
- Jika pengeluaran/debit/penarikan, type = "EXPENSE".
- Jika pemasukan/gaji/transfer masuk, type = "INCOME".
- amount harus berupa angka bulat positif (number).
- date: gunakan tanggal transaksi di screenshot, jika hanya ada bulan dan hari gunakan tahun sekarang (misal 2026-MM-DD).
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${errorText}`);
  }

  const resJson = await response.json();
  const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
  const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = (formData.get("file") || formData.get("screenshot")) as File;

    if (!file) {
      return NextResponse.json({ error: "File gambar tidak ditemukan dalam request" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Cari akun Bank utama untuk menampung mutasi
    let targetAccount = await prisma.account.findFirst({
      where: { type: "BANK" },
    });

    if (!targetAccount) {
      targetAccount = await prisma.account.findFirst();
    }

    if (!targetAccount) {
      return NextResponse.json({ error: "Belum ada akun / dompet terdaftar" }, { status: 400 });
    }

    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Parse mutasi via AI Vision
    const parsedItems = await parseScreenshotWithGemini(buffer, file.type);

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Tidak ada transaksi yang terdeteksi dari screenshot",
      });
    }

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timeString = `${hours}:${minutes}:${seconds}`;

    // Tulis transaksi ke ledger
    const insertedTransactions = await prisma.$transaction(async (tx) => {
      const records = [];

      for (const item of parsedItems) {
        const amt = new Prisma.Decimal(item.amount);
        const itemDate = item.date ? new Date(item.date) : now;

        const record = await tx.transaction.create({
          data: {
            type: item.type as TransactionType,
            amount: amt,
            total: amt,
            convertedAmount: new Prisma.Decimal(item.amount * 105),
            currency: targetAccount.currency,
            exchangeRate: new Prisma.Decimal(105),
            merchant: item.description || "Scan Shortcut iOS",
            date: itemDate,
            time: timeString,
            sourceAccountId: targetAccount.id,
            userId: user.id,
          },
        });

        await BalanceEngine.applyTransaction(
          tx,
          record.type,
          record.total,
          record.sourceAccountId,
          null
        );

        records.push(record);
      }

      return records;
    });

    return NextResponse.json({
      success: true,
      count: insertedTransactions.length,
      account: targetAccount.name,
      items: insertedTransactions.map((t) => ({
        merchant: t.merchant,
        amount: Number(t.total),
        type: t.type,
      })),
    });
  } catch (error: any) {
    console.error("Shortcut API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}