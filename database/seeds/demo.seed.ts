import { PrismaClient } from '@prisma/client';

export async function seedDemo(prisma: PrismaClient) {
  console.log('Seeding Demo Data (Users, Teams, Expenses)...');

  const adminUser = await prisma.user.create({
    data: {
      name: 'FlowTera Admin',
      username: 'flowtera_admin',
      email: 'admin@flowtera.app',
      password: 'hashed_password_placeholder', // Replace with bcrypt hash before use
      settings: { theme: 'light', language: 'tr' },
    },
  });

  const team1 = await prisma.team.create({
    data: {
      name: 'Demo Team',
      category: 'General',
      ownerId: adminUser.id,
      settings: { currency: 'USD', workspaceType: 'Corporate' },
    },
  });

  await prisma.teamMember.create({
    data: {
      userId:      adminUser.id,
      teamId:      team1.id,
      roleName:    'Admin',
      permissions: [],
    },
  });

  await prisma.expense.create({
    data: {
      title:         'Server Hosting',
      category:      'Infrastructure',
      merchant:      'DigitalOcean',
      date:          new Date('2026-03-08T00:00:00Z'),
      amount:        45.00,
      currency:      'USD',
      currencySymbol: '$',
      status:        'approved',
      createdById:   adminUser.id,
      teamId:        team1.id,
      exchangeRates: { USD: 1, TRY: 35.12 },
    },
  });

  console.log('✅ Demo seed complete. admin:', adminUser.id);
}
