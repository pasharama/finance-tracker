import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BalanceEngine } from "@/features/ledger/balance-engine";
import { CurrencyEngine } from "@/features/currency/currency-engine";
import { Prisma, TransactionType } from "@prisma/client";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existingTx = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTx) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await BalanceEngine.rollbackTransaction(
        tx,
        existingTx.type,
        existingTx.total,
        existingTx.sourceAccountId,
        existingTx.destinationAccountId
      );

      await tx.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true, message: "Transaksi berhasil dihapus" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { amount, merchant, type, sourceAccountId, date } = body;

    const existingTx = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTx) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    const newAmount = new Prisma.Decimal(amount);
    const rate = Number(existingTx.exchangeRate) || 105;
    const newConverted = new Prisma.Decimal(
      CurrencyEngine.calculateConverted(Number(newAmount), rate)
    );

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Rollback saldo mutasi lama
      await BalanceEngine.rollbackTransaction(
        tx,
        existingTx.type,
        existingTx.total,
        existingTx.sourceAccountId,
        existingTx.destinationAccountId
      );

      // 2. Update record termasuk tanggal
      const record = await tx.transaction.update({
        where: { id },
        data: {
          amount: newAmount,
          total: newAmount,
          convertedAmount: newConverted,
          merchant: merchant ? String(merchant).trim() : existingTx.merchant,
          type: (type as TransactionType) || existingTx.type,
          sourceAccountId: sourceAccountId || existingTx.sourceAccountId,
          date: date ? new Date(date) : existingTx.date,
        },
      });

      // 3. Terapkan saldo mutasi baru
      await BalanceEngine.applyTransaction(
        tx,
        record.type,
        record.total,
        record.sourceAccountId,
        record.destinationAccountId
      );

      return record;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}