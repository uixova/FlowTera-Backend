const prisma = require('../../config/prisma');

class MemberService {
  // Üye rol ve izinlerini güncelle (EditRoleModal'dan tetiklenir)
  async updateMember(teamId: string, userId: string, roleName: string, permissions: string[] = []) {
    const updated = await prisma.teamMember.update({
      where: { userId_teamId: { userId, teamId } },
      data:  { roleName, permissions },
    });

    // Aktivite logu — fire & forget
    prisma.teamLog.create({
      data: {
        teamId,
        type:     'member_role_update',
        role:     roleName,
        action:   `Rol güncellendi`,
        target:   userId,
        icon:     'shield',
        iconClass: 'blue',
      },
    }).catch(() => {});

    return updated;
  }

  // Üye çıkarma
  async removeMember(teamId: string, userId: string) {
    await prisma.teamMember.delete({
      where: { userId_teamId: { userId, teamId } },
    });

    // Üye sayısını güncelle
    const count = await prisma.teamMember.count({ where: { teamId } });
    await prisma.team.update({ where: { id: teamId }, data: { membersCount: count } });

    // Aktivite logu
    prisma.teamLog.create({
      data: {
        teamId,
        type:      'member_remove',
        action:    'Üye çıkarıldı',
        target:    userId,
        icon:      'user-minus',
        iconClass: 'red',
      },
    }).catch(() => {});

    return { message: 'Üye başarıyla çıkarıldı.' };
  }

  // Takıma yeni üye davet et / ekle
  async addMember(teamId: string, userId: string, roleName = 'Member', permissions: string[] = []) {
    const existing = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (existing) throw new Error('Kullanıcı zaten bu takımın üyesi.');

    const member = await prisma.teamMember.create({
      data: { userId, teamId, roleName, permissions },
    });

    // Üye sayısını güncelle
    const count = await prisma.teamMember.count({ where: { teamId } });
    await prisma.team.update({ where: { id: teamId }, data: { membersCount: count } });

    return member;
  }
}

module.exports = new MemberService();
export {};
