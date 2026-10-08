import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BalanceEngine } from "@/features/ledger/balance-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu transaksi" }, { status: 400 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { id: { in: ids } },
    });

    await prisma.$transaction(async (tx) => {
      // 1. Rollback setiap saldo transaksi yang dipilih
      for (const item of transactions) {
        await BalanceEngine.rollbackTransaction(
          tx,
          item.type,
          item.total,
          item.sourceAccountId,
          item.destinationAccountId
        );
      }

      // 2. Hapus secara massal
      await tx.transaction.deleteMany({
        where: { id: { in: ids } },
      });
    });

    return NextResponse.json({ success: true, count: transactions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}