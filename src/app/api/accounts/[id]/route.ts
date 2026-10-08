import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma, TransactionType } from "@prisma/client";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const body = await req.json();
    const { name, type, newBalance, reason } = body;

    const existingAccount = await prisma.account.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }

    if (newBalance !== undefined && newBalance !== null) {
      const parsedNewBal = parseFloat(newBalance);
      if (isNaN(parsedNewBal) || parsedNewBal < 0) {
        return NextResponse.json({ error: "Saldo dompet tidak boleh minus (minimal ¥0)" }, { status: 400 });
      }
    }

    const updatedAccount = await prisma.$transaction(async (tx) => {
      let finalBalance = existingAccount.currentBalance;

      if (newBalance !== undefined && newBalance !== null && !isNaN(Number(newBalance))) {
        const targetVal = new Prisma.Decimal(newBalance);
        const currentVal = existingAccount.currentBalance;
        const diff = Number(targetVal) - Number(currentVal);

        if (diff !== 0) {
          const isPositive = diff > 0;
          const absDiff = new Prisma.Decimal(Math.abs(diff));
          const note = reason ? String(reason).trim() : "Koreksi manual";
          const now = new Date();
          
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          const seconds = String(now.getSeconds()).padStart(2, "0");
          const currentTimeString = `${hours}:${minutes}:${seconds}`;

          await tx.transaction.create({
            data: {
              type: isPositive ? TransactionType.INCOME : TransactionType.EXPENSE,
              amount: absDiff,
              total: absDiff,
              convertedAmount: new Prisma.Decimal(Math.abs(diff) * 105),
              currency: existingAccount.currency || "JPY",
              exchangeRate: new Prisma.Decimal(105),
              merchant: `[Penyesuaian Saldo ${name || existingAccount.name}] ${note}`,
              date: now,
              time: currentTimeString,
              sourceAccountId: existingAccount.id,
              userId: user.id,
            },
          });

          finalBalance = targetVal;
        }
      }

      return await tx.account.update({
        where: { id },
        data: {
          name: name ? String(name).trim() : existingAccount.name,
          type: type || existingAccount.type,
          currentBalance: finalBalance,
        },
      });
    });

    return NextResponse.json({ success: true, data: updatedAccount });
  } catch (error: any) {
    console.error("Account Adjustment Error:", error);
    return NextResponse.json({ error: error.message || "Gagal menyesuaikan saldo" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    const existingAccount = await prisma.account.findFirst({
      where: { id, userId: user.id },
      include: {
        _count: {
          select: {
            sourceTransactions: true,
            destinationTransactions: true,
          },
        },
      },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    }

    const totalTx = existingAccount._count.sourceTransactions + existingAccount._count.destinationTransactions;
    if (totalTx > 0) {
      return NextResponse.json(
        { error: `Dompet "${existingAccount.name}" tidak dapat dihapus karena memiliki ${totalTx} riwayat transaksi aktif.` },
        { status: 400 }
      );
    }

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Dompet berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}