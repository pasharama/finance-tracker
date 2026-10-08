import { NextResponse } from "next/server";

// Cache kurs selama 10 menit agar cepat dan hemat bandwidth
let cachedRate: number | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 menit

export async function GET() {
  const now = Date.now();

  if (cachedRate && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json({ rate: cachedRate, source: "cache" });
  }

  try {
    // Sumber 1: ExchangeRate-API Open Access
    const res = await fetch("https://open.er-api.com/v6/latest/JPY", {
      next: { revalidate: 600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.IDR) {
        // Bulatkan ke 2 desimal atau integer sesuai kebutuhan pasar
        cachedRate = Math.round(data.rates.IDR * 100) / 100;
        lastFetchTime = now;
        return NextResponse.json({ rate: cachedRate, source: "live-api" });
      }
    }
    
    // Sumber cadangan (Frankfurter ECB feed)
    const backupRes = await fetch("https://api.frankfurter.dev/v1/latest?base=JPY&symbols=IDR");
    if (backupRes.ok) {
      const backupData = await backupRes.json();
      if (backupData?.rates?.IDR) {
        cachedRate = Math.round(backupData.rates.IDR * 100) / 100;
        lastFetchTime = now;
        return NextResponse.json({ rate: cachedRate, source: "frankfurter" });
      }
    }
  } catch (error) {
    console.error("Gagal mengambil live rate:", error);
  }

  // Jika koneksi internet offline, gunakan fallback terkini
  return NextResponse.json({
    rate: cachedRate || 113.2,
    source: "fallback",
  });
}