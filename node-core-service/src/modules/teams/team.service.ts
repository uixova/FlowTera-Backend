const prisma = require('../../config/prisma');
const { DEFAULT_SUBSCRIPTION } = require('../../config/constants');

const ROLE_PRIORITY: Record<string, number> = { Admin: 1, Moderator: 2, Member: 3 };

class TeamService {
  // Kullanıcının üye olduğu tüm takımları getir
  async getTeamsByUserId(userId: string) {
    const teams = await prisma.team.findMany({
      where:   { members: { some: { userId } }, isDeleted: false },
      include: { members: true },
    });

    return teams.map((team: any) => ({
      ...team,
      membersCount: team.members?.length || 0,
    }));
  }

  // Takımı tam detayıyla getir
  async getTeamById(teamId: string) {
    return prisma.team.findUnique({
      where:   { id: teamId },
      include: { members: true },
    });
  }

  // Üyeleri zenginleştirilmiş şekilde getir
  async getTeamMembers(teamId: string) {
    const team = await prisma.team.findUnique({
      where:   { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { name: true, avatar: true, email: true, isDeleted: true, lastLogin: true } },
          },
        },
      },
    });
    if (!team) return [];

    return team.members
      .map((m: any) => ({
        id:          m.userId,
        name:        m.user?.isDeleted ? 'DeletedUser' : (m.user?.name  || 'Unknown'),
        avatar:      m.user?.isDeleted ? null          : (m.user?.avatar || null),
        email:       m.user?.isDeleted ? ''            : (m.user?.email  || ''),
        isDeleted:   m.user?.isDeleted || false,
        lastLogin:   m.user?.lastLogin || null,
        role:        (m.roleName || 'Member').toLowerCase(),
        roleName:    m.roleName    || 'Member',
        permissions: m.permissions || [],
      }))
      .sort((a: any, b: any) => (ROLE_PRIORITY[a.roleName] ?? 99) - (ROLE_PRIORITY[b.roleName] ?? 99));
  }

  // Takım ayarları + plan detayları
  async getTeamSettings(teamId: string) {
    const team = await prisma.team.findUnique({
      where:   { id: teamId },
      include: { members: true },
    });
    if (!team) return null;

    // Plan bilgisi takımın settings.planContext Json alanında tutulur
    const planContext = (team.settings as any)?.planContext || {};
    const planId      = planContext.planId;
    const planDetails = planId
      ? await prisma.plan.findUnique({ where: { id: planId } })
      : null;

    const adminPlanLimit    = planDetails?.promise
      ? parseInt((planDetails.promise as any).TeamMemberLimit || '5', 10)
      : (planContext.maxMembersAllowed || 5);

    return {
      ...team,
      adminPlanLimit,
      ownerPlanType:     planDetails?.name || planContext.planName || 'Free',
      availableFeatures: planDetails?.feature_keys || [],
      planDetails:       planDetails || null,
    };
  }

  // Yeni takım oluştur
  async createTeam(input: any, ownerId: string) {
    const ownerSubscription = await prisma.user.findUnique({ where: { id: ownerId }, select: { subscription: true } });
    const sub = (ownerSubscription?.subscription as any) || DEFAULT_SUBSCRIPTION;

    // Sahip olduğu takım sayısını kontrol et
    const existingTeams = await prisma.team.count({ where: { ownerId, isDeleted: false } });
    const maxTeams      = sub.maxTeams || 1;
    if (existingTeams >= maxTeams) {
      throw new Error(`Plan limitiniz aşıldı. En fazla ${maxTeams} takım oluşturabilirsiniz.`);
    }

    return prisma.$transaction(async (tx: any) => {
      const team = await tx.team.create({
        data: {
          name:     input.name,
          category: input.category,
          image:    input.image || null,
          ownerId,
          settings: input.settings || {},
          membersCount: 1,
        },
      });

      // Kurucu otomatik Admin olarak eklenir
      await tx.teamMember.create({
        data: {
          userId:      ownerId,
          teamId:      team.id,
          roleName:    'Admin',
          permissions: [],
        },
      });

      return team;
    });
  }

  // Takım bilgilerini güncelle
  async updateTeam(teamId: string, data: any) {
    return prisma.team.update({ where: { id: teamId }, data });
  }

  // Takım ayarlarını güncelle (settings Json alanı patch)
  async updateTeamSettings(teamId: string, settingsPatch: any) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error('Takım bulunamadı.');

    const merged = { ...(team.settings as any || {}), ...settingsPatch };
    return prisma.team.update({ where: { id: teamId }, data: { settings: merged } });
  }

  // Soft delete — yalnızca takım kurucusu silebilir
  async deleteTeam(teamId: string, requesterId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
    if (!team) throw new Error('Takım bulunamadı.');
    if (team.ownerId !== requesterId) throw new Error('Takımı yalnızca kurucu silebilir.');
    return prisma.team.update({ where: { id: teamId }, data: { isDeleted: true } });
  }
}

module.exports = new TeamService();
export {};
