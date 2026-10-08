import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BalanceEngine } from "@/features/ledger/balance-engine";
import { CurrencyEngine } from "@/features/currency/currency-engine";
import { Prisma, TransactionType } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        sourceAccount: true,
        destinationAccount: true,
        category: true,
      },
    });
    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type, amount, merchant, sourceAccountId, destinationAccountId, categoryId, currency, date } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Nominal harus lebih dari 0" }, { status: 400 });
    }

    if (type === "TRANSFER") {
      if (!sourceAccountId || !destinationAccountId) {
        return NextResponse.json({ error: "Pilih dompet asal dan dompet tujuan" }, { status: 400 });
      }
      if (sourceAccountId === destinationAccountId) {
        return NextResponse.json({ error: "Dompet asal dan tujuan tidak boleh sama" }, { status: 400 });
      }
    }

    if ((type === "EXPENSE" || type === "TRANSFER") && sourceAccountId) {
      const sourceAcc = await prisma.account.findFirst({
        where: { id: sourceAccountId, userId: user.id },
      });

      if (!sourceAcc) {
        return NextResponse.json({ error: "Dompet sumber tidak ditemukan" }, { status: 404 });
      }

      const availableBalance = Number(sourceAcc.currentBalance);
      if (availableBalance < numAmount) {
        return NextResponse.json(
          {
            error: `Saldo ${sourceAcc.name} tidak cukup! Saldo saat ini: ¥${availableBalance.toLocaleString()}, diperlukan: ¥${numAmount.toLocaleString()}`,
          },
          { status: 400 }
        );
      }
    }

    const txAmount = new Prisma.Decimal(numAmount);
    const txCurrency = currency || "JPY";

    const now = new Date();
    let txDate = new Date();

    if (date) {
      const [year, month, day] = date.split("-").map(Number);
      txDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const currentTimeString = `${hours}:${minutes}:${seconds}`;

    const rate = 105;
    const convertedAmount = new Prisma.Decimal(
      CurrencyEngine.calculateConverted(Number(txAmount), rate)
    );

    const result = await prisma.$transaction(async (tx) => {
      let defaultMerchant = "Quick Expense";
      if (type === "INCOME") defaultMerchant = "Quick Income";
      if (type === "TRANSFER") defaultMerchant = "Transfer Saldo";

      const record = await tx.transaction.create({
        data: {
          type: type as TransactionType,
          amount: txAmount,
          currency: txCurrency,
          total: txAmount,
          convertedAmount,
          exchangeRate: new Prisma.Decimal(rate),
          merchant: merchant ? String(merchant).trim() : defaultMerchant,
          date: txDate,
          time: currentTimeString,
          sourceAccountId: sourceAccountId || null,
          destinationAccountId: destinationAccountId || null,
          categoryId: categoryId || null,
          userId: user.id,
        },
      });

      await BalanceEngine.applyTransaction(
        tx,
        record.type,
        record.total,
        record.sourceAccountId,
        record.destinationAccountId
      );

      return record;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Create Transaction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}