import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BalanceEngine } from "@/features/ledger/balance-engine";
import { Prisma, TransactionType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { items, sourceAccountId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Tidak ada transaksi yang dimasukkan" }, { status: 400 });
    }

    const targetAccount = await prisma.account.findFirst({
      where: { id: sourceAccountId, userId: user.id },
    });

    if (!targetAccount) {
      return NextResponse.json({ error: "Dompet tujuan tidak ditemukan" }, { status: 404 });
    }

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timeString = `${hours}:${minutes}:${seconds}`;

    const created = await prisma.$transaction(async (tx) => {
      const records = [];
      for (const item of items) {
        const amt = new Prisma.Decimal(item.amount);
        const itemDate = item.date ? new Date(item.date) : now;

        const record = await tx.transaction.create({
          data: {
            type: item.type as TransactionType,
            amount: amt,
            total: amt,
            convertedAmount: new Prisma.Decimal(Number(item.amount) * 105),
            currency: targetAccount.currency,
            exchangeRate: new Prisma.Decimal(105),
            merchant: item.description || "Scan Statement",
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

    return NextResponse.json({ success: true, count: created.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}