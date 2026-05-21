import { PrismaClient } from '@prisma/client';
import { seedPlans } from './plans.seed.js';
import { seedRoles } from './roles.seed.js';
import { seedDemo } from './demo.seed.js';

const prisma = new PrismaClient();

async function main() {
  await seedPlans(prisma);
  await seedRoles(prisma);
  await seedDemo(prisma);
  console.log('✅ Seed işlemi başarıyla tamamlandı!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });