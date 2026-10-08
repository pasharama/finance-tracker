import { PrismaClient, AccountType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "owner@financetracker.local" },
    update: {},
    create: {
      email: "owner@financetracker.local",
      name: "Owner",
      profile: {
        create: {
          timezone: "Asia/Tokyo",
          defaultCurrency: "JPY",
          secondaryCurrency: "IDR",
        },
      },
    },
  });

  const accounts = [
    { name: "Cash JPY", type: AccountType.CASH, currency: "JPY", currentBalance: 20000 },
    { name: "Bank SMBC", type: AccountType.BANK, currency: "JPY", currentBalance: 150000 },
    { name: "PayPay", type: AccountType.PAYPAY, currency: "JPY", currentBalance: 12500 },
    { name: "Suica", type: AccountType.SUICA, currency: "JPY", currentBalance: 3200 },
  ];

  for (const acc of accounts) {
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, name: acc.name },
    });
    if (!existing) {
      await prisma.account.create({
        data: { ...acc, userId: user.id },
      });
    }
  }

  const categories = [
    { name: "Food & Dining", icon: "🍜" },
    { name: "Transport", icon: "🚆" },
    { name: "Convenience Store", icon: "🏪" },
    { name: "Utilities", icon: "💡" },
    { name: "Salary", icon: "💰" },
  ];

  for (const cat of categories) {
    const existing = await prisma.category.findFirst({
      where: { userId: user.id, name: cat.name },
    });
    if (!existing) {
      await prisma.category.create({
        data: { ...cat, userId: user.id },
      });
    }
  }

  console.log("Seeding selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });