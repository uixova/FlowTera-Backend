const prisma  = require('../../config/prisma');
const logs    = require('../../utils/logWriter');
const notify  = require('../../utils/notifyTrigger');

// Takımda kalan Admin sayısını döner
const countAdmins = (teamId: string): Promise<number> =>
  prisma.teamMember.count({ where: { teamId, roleName: 'Admin' } });

class MemberService {
  // Üye rol ve izinlerini güncelle (EditRoleModal'dan tetiklenir)
  async updateMember(teamId: string, userId: string, roleName: string, permissions: string[] = [], adminName = '') {
    // ── RBAC: son admin koruması ──────────────────────────────────────────────
    const current = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!current) throw new Error('Üye bulunamadı.');

    if (current.roleName === 'Admin' && roleName !== 'Admin') {
      const adminCount = await countAdmins(teamId);
      if (adminCount <= 1) {
        throw new Error('Takımın son yöneticisinin rolü değiştirilemez. Önce başka bir üyeyi yönetici yapın.');
      }
    }

    // ── RBAC: owner rolü değiştirilemez ──────────────────────────────────────
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
    if (team?.ownerId === userId) {
      throw new Error('Takım kurucusunun rolü değiştirilemez.');
    }

    const updated = await prisma.teamMember.update({
      where: { userId_teamId: { userId, teamId } },
      data:  { roleName, permissions },
    });

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null);
    const targetName = targetUser?.name || userId;

    logs.writeTeamLog({
      teamId,
      type:     'member_role_update',
      userName: adminName || 'Admin',
      role:     'Admin',
      badge:    'Admin',
      action:   'rolünü güncelledi:',
      target:   targetName,
      details:  { new_role: roleName },
    });

    return updated;
  }

  // Üye çıkar (admin aksiyonu)
  async removeMember(teamId: string, userId: string, adminName = '') {
    const target = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!target) throw new Error('Üye bulunamadı.');

    // ── RBAC: owner çıkarılamaz ───────────────────────────────────────────────
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
    if (team?.ownerId === userId) {
      throw new Error('Takım kurucusu çıkarılamaz. Takımı silmek için önce takımı silin.');
    }

    // ── RBAC: son admin çıkarılamaz ──────────────────────────────────────────
    if (target.roleName === 'Admin') {
      const adminCount = await countAdmins(teamId);
      if (adminCount <= 1) {
        throw new Error('Takımın son yöneticisi çıkarılamaz. Önce başka bir üyeyi yönetici yapın veya takımı silin.');
      }
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null);
    const targetName = targetUser?.name || userId;

    await prisma.teamMember.delete({ where: { userId_teamId: { userId, teamId } } });

    const count = await prisma.teamMember.count({ where: { teamId } });
    await prisma.team.update({ where: { id: teamId }, data: { membersCount: count } });

    logs.logMemberRemoved(teamId, adminName || 'Admin', targetName);

    return { message: 'Üye başarıyla çıkarıldı.' };
  }

  // Takımdan ayrılma — kendi isteğiyle (free_exit permission kontrolü yapılır)
  async leaveTeam(teamId: string, userId: string) {
    const member = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!member) throw new Error('Bu takımın üyesi değilsiniz.');

    // RBAC: owner takımdan çıkamaz 
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
    if (team?.ownerId === userId) {
      throw new Error('Takım kurucusu takımdan ayrılamaz. Takımı silmek için yönetim panelini kullanın.');
    }

    // RBAC: free_exit engeli (negatif model: listede varsa BLOKLU) 
    const blockedPermissions: string[] = member.permissions || [];
    if (blockedPermissions.includes('free_exit')) {
      throw new Error('Takımdan çıkma yetkiniz yok. Bir yöneticiden kaldırılmanızı talep edin.');
    }

    // RBAC: son admin ayrılamaz
    if (member.roleName === 'Admin') {
      const adminCount = await countAdmins(teamId);
      if (adminCount <= 1) {
        throw new Error('Son yönetici olarak takımdan ayrılamazsınız. Önce başka bir üyeyi yönetici yapın.');
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null);
    const userName = user?.name || userId;

    await prisma.teamMember.delete({ where: { userId_teamId: { userId, teamId } } });

    const count = await prisma.teamMember.count({ where: { teamId } });
    await prisma.team.update({ where: { id: teamId }, data: { membersCount: count } });

    logs.writeTeamLog({
      teamId,
      type:     'member_left',
      userName,
      role:     member.roleName || 'Member',
      badge:    'Member',
      action:   'takımdan ayrıldı',
      target:   '',
    });

    notify.notifyMemberLeft(teamId, userName);

    return { message: 'Takımdan başarıyla ayrıldınız.' };
  }

  // Takıma yeni üye davet et / ekle
  async addMember(
    teamId:      string,
    userId:      string,
    roleName     = 'Member',
    permissions: string[] = [],
    adminId      = '',
    adminName    = '',
  ) {
    const existing = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (existing) throw new Error('Kullanıcı zaten bu takımın üyesi.');

    const member = await prisma.teamMember.create({
      data: { userId, teamId, roleName, permissions },
    });

    const count = await prisma.teamMember.count({ where: { teamId } });
    await prisma.team.update({ where: { id: teamId }, data: { membersCount: count } });

    const newUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null);
    const newMemberName = newUser?.name || userId;

    logs.logMemberJoined(teamId, adminName || 'Admin', newMemberName, roleName);

    if (adminId) {
      notify.notifyTeamInvite(userId, teamId, adminName || 'Admin', adminId);
    }

    notify.notifyMemberJoined(teamId, newMemberName);

    return member;
  }
}

module.exports = new MemberService();
export {};
