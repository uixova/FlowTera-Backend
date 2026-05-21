const prisma = require('../../config/prisma');
const { hashPassword, comparePassword } = require('../../utils/bcrypt');
const { DEFAULT_SUBSCRIPTION, DEFAULT_SETTINGS, DEFAULT_PAGE_SIZE } = require('../../config/constants');

const mapUser = (user: any) => {
  const { password, teamMemberships, ...rest } = user;
  return {
    ...rest,
    subscription: user.subscription || DEFAULT_SUBSCRIPTION,
    settings:     user.settings     || DEFAULT_SETTINGS,
    role: (teamMemberships || []).map((m: any) => ({
      teamId:      m.teamId,
      roleName:    m.roleName,
      permissions: m.permissions || [],
    })),
    teams: (teamMemberships || []).map((m: any) => m.teamId),
  };
};

class UserService {
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where:   { id, isDeleted: false },
      include: { teamMemberships: true },
    });
    if (!user) return null;
    return mapUser(user);
  }

  async getAllUsers(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * pageSize;

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where:   { isDeleted: false },
        skip,
        take:    pageSize,
        orderBy: { joinedDate: 'desc' },
        include: { teamMemberships: true },
      }),
      prisma.user.count({ where: { isDeleted: false } }),
    ]);

    return {
      data:       users.map(mapUser),
      hasMore:    totalCount > skip + pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      page,
      pageSize,
    };
  }

  async updateProfile(id: string, data: any) {
    if (data.email || data.username) {
      const conditions: any[] = [];
      if (data.email)    conditions.push({ email: data.email.trim().toLowerCase() });
      if (data.username) conditions.push({ username: data.username });

      const conflict = await prisma.user.findFirst({ where: { OR: conditions, NOT: { id } } });
      if (conflict) {
        const field = conflict.email === data.email?.trim().toLowerCase() ? 'e-posta' : 'kullanıcı adı';
        throw new Error(`Bu ${field} zaten kullanımda.`);
      }
      if (data.email) data.email = data.email.trim().toLowerCase();
    }

    const user = await prisma.user.update({
      where:   { id },
      data,
      include: { teamMemberships: true },
    });
    return mapUser(user);
  }

  async updateSettings(id: string, newSettings: any) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Kullanıcı bulunamadı.');

    const merged = { ...(user.settings || DEFAULT_SETTINGS), ...newSettings };
    if (newSettings.notifications) {
      merged.notifications = { ...(user.settings?.notifications || {}), ...newSettings.notifications };
    }

    const updated = await prisma.user.update({
      where:   { id },
      data:    { settings: merged },
      include: { teamMemberships: true },
    });
    return mapUser(updated);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Kullanıcı bulunamadı.');

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) throw new Error('Mevcut şifre hatalı.');

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    return { message: 'Şifre başarıyla güncellendi.' };
  }

  async deleteAccount(id: string) {
    const ownedTeams = await prisma.team.count({ where: { ownerId: id, isDeleted: false } });
    if (ownedTeams > 0) {
      throw new Error('Hesabınızı silmeden önce sahip olduğunuz takımları devredin veya silin.');
    }
    await prisma.user.update({ where: { id }, data: { isDeleted: true, status: 'inactive' } });
    return { message: 'Hesap başarıyla silindi.' };
  }
}

module.exports = new UserService();
export {};
