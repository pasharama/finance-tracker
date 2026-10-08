import { Prisma, TransactionType } from "@prisma/client";

export class BalanceEngine {
  static async applyTransaction(
    tx: Prisma.TransactionClient,
    type: TransactionType,
    total: Prisma.Decimal,
    sourceAccountId?: string | null,
    destinationAccountId?: string | null
  ) {
    if (type === TransactionType.EXPENSE) {
      if (!sourceAccountId) throw new Error("Source wallet is required for expense");
      await tx.account.update({
        where: { id: sourceAccountId },
        data: { currentBalance: { decrement: total } },
      });
    } else if (type === TransactionType.INCOME) {
      if (!sourceAccountId) throw new Error("Wallet is required for income");
      await tx.account.update({
        where: { id: sourceAccountId },
        data: { currentBalance: { increment: total } },
      });
    } else if (type === TransactionType.TRANSFER) {
      if (!sourceAccountId || !destinationAccountId) {
        throw new Error("Both source and destination wallets are required for transfer");
      }
      await tx.account.update({
        where: { id: sourceAccountId },
        data: { currentBalance: { decrement: total } },
      });
      await tx.account.update({
        where: { id: destinationAccountId },
        data: { currentBalance: { increment: total } },
      });
    }
  }

  // Mengembalikan saldo ke keadaan semula saat transaksi dihapus / sebelum diedit
  static async rollbackTransaction(
    tx: Prisma.TransactionClient,
    type: TransactionType,
    total: Prisma.Decimal,
    sourceAccountId?: string | null,
    destinationAccountId?: string | null
  ) {
    if (type === TransactionType.EXPENSE && sourceAccountId) {
      await tx.account.update({
        where: { id: sourceAccountId },
        data: { currentBalance: { increment: total } },
      });
    } else if (type === TransactionType.INCOME && sourceAccountId) {
      await tx.account.update({
        where: { id: sourceAccountId },
        data: { currentBalance: { decrement: total } },
      });
    } else if (type === TransactionType.TRANSFER) {
      if (sourceAccountId) {
        await tx.account.update({
          where: { id: sourceAccountId },
          data: { currentBalance: { increment: total } },
        });
      }
      if (destinationAccountId) {
        await tx.account.update({
          where: { id: destinationAccountId },
          data: { currentBalance: { decrement: total } },
        });
      }
    }
  }
}