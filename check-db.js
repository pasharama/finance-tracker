const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("=== DAFTAR USER DI DATABASE ===");
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  console.table(users);

  console.log("\n=== DAFTAR DOMPET & USER_ID PEMILIKNYA ===");
  const accounts = await prisma.account.findMany({
    select: { id: true, name: true, currentBalance: true, userId: true }
  });
  console.table(accounts);
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });