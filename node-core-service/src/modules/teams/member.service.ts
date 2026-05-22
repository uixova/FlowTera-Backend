const prisma  = require('../../config/prisma');
const logs    = require('../../utils/logWriter');
const notify  = require('../../utils/notifyTrigger');

class MemberService {
  // Üye rol ve izinlerini güncelle (EditRoleModal'dan tetiklenir)
  async updateMember(teamId: string, userId: string, roleName: string, permissions: string[] = [], adminName = '') {
    const updated = await prisma.teamMember.update({
      where: { userId_teamId: { userId, teamId } },
      data:  { roleName, permissions },
    });

    // Hedef kullanıcının adını bul
    const targetUser = await prisma.user.findUnique({
      where:  { id: userId },
      select: { name: true },
    }).catch(() => null);
    const targetName = targetUser?.name || userId;

    // TeamLog — rol güncellendi
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

  // Üye çıkar
  async removeMember(teamId: string, userId: string, adminName = '') {
    // Çıkarılacak üyenin adını önce al
    const targetUser = await prisma.user.findUnique({
      where:  { id: userId },
      select: { name: true },
    }).catch(() => null);
    const targetName = targetUser?.name || userId;

    await prisma.teamMember.delete({
      where: { userId_teamId: { userId, teamId } },
    });

    // Üye sayısını güncelle
    const count = await prisma.teamMember.count({ where: { teamId } });
    await prisma.team.update({ where: { id: teamId }, data: { membersCount: count } });

    // TeamLog — üye çıkarıldı
    logs.logMemberRemoved(teamId, adminName || 'Admin', targetName);

    return { message: 'Üye başarıyla çıkarıldı.' };
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

    // Üye sayısını güncelle
    const count = await prisma.teamMember.count({ where: { teamId } });
    await prisma.team.update({ where: { id: teamId }, data: { membersCount: count } });

    // Eklenen üyenin adını bul
    const newUser = await prisma.user.findUnique({
      where:  { id: userId },
      select: { name: true },
    }).catch(() => null);
    const newMemberName = newUser?.name || userId;

    // TeamLog — yeni üye katıldı
    logs.logMemberJoined(teamId, adminName || 'Admin', newMemberName, roleName);

    // Davet bildirimi — kullanıcıya invite tipinde bildirim gönder
    if (adminId) {
      notify.notifyTeamInvite(userId, teamId, adminName || 'Admin', adminId);
    }

    // Takım geneline WS yayını — diğer üyeler anlık görür
    notify.notifyMemberJoined(teamId, newMemberName);

    return member;
  }
}

module.exports = new MemberService();
export {};
