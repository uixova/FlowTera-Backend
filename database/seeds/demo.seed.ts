import { PrismaClient } from '@prisma/client';

export async function seedDemo(prisma: PrismaClient) {
  console.log('Seeding Demo Data (Users, Teams, Expenses)...');

  // 1. Kullanıcıyı Oluştur
  const uixova = await prisma.user.create({
    data: {
      name: "UIXOVA",
      username: "uixova",
      email: "uixova@flowtera.in",
      password: "hashed_password_1", // Gerçek senaryoda bcrypt ile hashlenecek
      phone: "+90 555 123 4567",
      settings: { theme: "dark", language: "English" },
    }
  });

  // 2. Takımı Oluştur
  const team1 = await prisma.team.create({
    data: {
      name: "Main Development Team",
      category: "Software Development",
      ownerId: uixova.id,
      settings: { currency: "USD", workspaceType: "Corporate" }
    }
  });

  // 3. Kullanıcıyı Takıma Bağla (Yetkilerle)
  await prisma.teamMember.create({
    data: {
      userId: uixova.id,
      teamId: team1.id,
      roleName: "Admin",
      permissions: ["all"]
    }
  });

  // 4. Test Harcaması Ekle
  await prisma.expense.create({
    data: {
      title: "Server Hosting",
      category: "Infrastructure",
      merchant: "DigitalOcean",
      date: new Date("2026-03-08T00:00:00Z"),
      amount: 45.00,
      currency: "USD",
      currencySymbol: "$",
      status: "approved",
      createdById: uixova.id,
      teamId: team1.id,
      exchangeRates: { USD: 1, TRY: 35.12 }
    }
  });
}