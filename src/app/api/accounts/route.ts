import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma, AccountType } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            sourceTransactions: true,
            destinationTransactions: true,
          },
        },
      },
    });
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, type, initialBalance, currency } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama dompet wajib diisi" }, { status: 400 });
    }

    const initBal = new Prisma.Decimal(initialBalance || 0);
    const curr = currency || "JPY";

    const newAccount = await prisma.$transaction(async (tx) => {
      const acc = await tx.account.create({
        data: {
          name: String(name).trim(),
          type: (type as AccountType) || AccountType.OTHER,
          currency: curr,
          currentBalance: initBal,
          userId: user.id,
        },
      });

      if (Number(initBal) > 0) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const currentTimeString = `${hours}:${minutes}:${seconds}`;

        await tx.transaction.create({
          data: {
            type: "INCOME",
            amount: initBal,
            total: initBal,
            convertedAmount: new Prisma.Decimal(Number(initBal) * 105),
            currency: curr,
            exchangeRate: new Prisma.Decimal(105),
            merchant: `[Saldo Awal] ${acc.name}`,
            date: now,
            time: currentTimeString,
            sourceAccountId: acc.id,
            userId: user.id,
          },
        });
      }

      return acc;
    });

    return NextResponse.json({ success: true, data: newAccount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}