const prisma = require('../../config/prisma');

// Plan limitlerini kontrol eden merkezi kural motoru.
// Team.settings.planContext Json alanından maxMembersAllowed okunur;
// eşleşen Plan kaydından da doğrulama yapılır.
const checkMemberLimit = async (teamId: string, newMemberCount: number) => {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error('Takım bulunamadı.');

  const planContext    = (team.settings as any)?.planContext || {};
  const planId         = planContext.planId;

  let maxAllowed = planContext.maxMembersAllowed || 5;

  if (planId) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (plan?.promise) {
      const limit = parseInt((plan.promise as any).TeamMemberLimit || '5', 10);
      if (!isNaN(limit)) maxAllowed = limit;
    }
  }

  if (newMemberCount > maxAllowed) {
    throw new Error(`Plan limitiniz aşıldı. Bu takıma en fazla ${maxAllowed} üye ekleyebilirsiniz.`);
  }
};

const checkTeamLimit = async (ownerId: string) => {
  const sub = await prisma.user.findUnique({
    where:  { id: ownerId },
    select: { subscription: true },
  });

  const maxTeams = (sub?.subscription as any)?.maxTeams || 1;
  const current  = await prisma.team.count({ where: { ownerId, isDeleted: false } });

  if (current >= maxTeams) {
    throw new Error(`Plan limitiniz aşıldı. En fazla ${maxTeams} takım oluşturabilirsiniz.`);
  }
};

module.exports = { checkMemberLimit, checkTeamLimit };
export {};
