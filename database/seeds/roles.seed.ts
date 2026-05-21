import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  console.log('Roles/Permissions konsepti TeamMember üzerinde tutulacak.');
  // Şemamızda rolleri ayrı tablo yapmak yerine TeamMember permission array'i kullandık.
  // İleride buraya sabit "Role Templates" tablosu eklenebilir.
}