import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export class CurrencyEngine {
  static formatJPY(amount: number): string {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  static formatIDR(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount).replace("Rp", "Rp ");
  }

  static calculateConverted(amount: number, rate: number): number {
    return Math.round(amount * rate);
  }

  /**
   * Mengambil kurs live hari ini (JPY -> IDR).
   * 1. Cek DB apakah sudah ada kurs hari ini.
   * 2. Jika belum ada atau kadaluwarsa, fetch rate live dari endpoint valuta.
   * 3. Simpan ke DB agar tidak boros request API.
   */
  static async getLiveRate(from: string = "JPY", to: string = "IDR"): Promise<number> {
    if (from === to) return 1.0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // 1. Cek cache DB hari ini
      const cached = await prisma.exchangeRate.findFirst({
        where: {
          from,
          to,
          date: { gte: today },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (cached) {
        return Number(cached.rate);
      }

      // 2. Fetch kurs live dari open exchange API (Frankfurter / ExchangeRate-API)
      // Endpoint ini free, realtime, dan tidak butuh kartu kredit / API Key
      const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`, {
        next: { revalidate: 3600 }, // Cache Next.js 1 jam
      });

      if (res.ok) {
        const data = await res.json();
        const liveRate = data.rates?.[to];

        if (liveRate) {
          // 3. Simpan ke database
          await prisma.exchangeRate.create({
            data: {
              from,
              to,
              rate: new Prisma.Decimal(liveRate),
              date: today,
            },
          });
          return Number(liveRate);
        }
      }
    } catch (err) {
      console.warn("Gagal fetch kurs live, memakai rate fallback:", err);
    }

    // Fallback jika internet sedang offline
    return 105.0;
  }
}