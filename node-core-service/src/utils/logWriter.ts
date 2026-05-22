const prisma  = require('../config/prisma');
const logger  = require('./logger');

// TeamLog Tipleri 
// Frontend log.json'daki type değerleriyle birebir eşleşir
type TeamLogType =
  | 'expense_add'     | 'expense_approve'   | 'expense_update'
  | 'trip_add'        | 'trip_approval'     | 'status_update'
  | 'rejection'       | 'member_join'       | 'member_remove'
  | 'member_role_update' | 'system_update'  | 'request_create'
  | 'request_approve' | 'request_reject'    | 'settings_update';

interface TeamLogInput {
  teamId:    string;
  type:      TeamLogType;
  userName:  string;         // Aksiyonu yapan kullanıcının adı
  role:      string;         // Admin | Moderator | Member | system
  badge:     string;         // Admin | Mod | Member | System
  action:    string;         // "ekledi" | "onayladı" vb.
  target:    string;         // Hedef kaydın adı (fatura başlığı, üye adı vb.)
  icon?:     string;
  iconClass?: string;
  amount?:   string;
  tag?:      string;
  tagClass?: string;
  details?:  Record<string, string>;
}

// Tip → ikon eşlemesi 
const LOG_ICON: Record<TeamLogType, { icon: string; iconClass: string }> = {
  expense_add:        { icon: 'ti-cloud-computing', iconClass: 'log-expense' },
  expense_approve:    { icon: 'ti-check',           iconClass: 'log-approve' },
  expense_update:     { icon: 'ti-edit',            iconClass: 'log-expense' },
  trip_add:           { icon: 'ti-plane-departure', iconClass: 'log-trip'    },
  trip_approval:      { icon: 'ti-plane-departure', iconClass: 'log-trip'    },
  status_update:      { icon: 'ti-car',             iconClass: 'log-trip'    },
  rejection:          { icon: 'ti-x',               iconClass: 'log-delete'  },
  member_join:        { icon: 'ti-user-plus',       iconClass: 'log-system'  },
  member_remove:      { icon: 'ti-user-minus',      iconClass: 'log-delete'  },
  member_role_update: { icon: 'ti-shield',          iconClass: 'log-system'  },
  system_update:      { icon: 'ti-settings-automation', iconClass: 'log-system' },
  request_create:     { icon: 'ti-send',            iconClass: 'log-expense' },
  request_approve:    { icon: 'ti-check',           iconClass: 'log-approve' },
  request_reject:     { icon: 'ti-x',               iconClass: 'log-delete'  },
  settings_update:    { icon: 'ti-settings',        iconClass: 'log-system'  },
};

// Yardımcı: Rozet / Badge
const roleToBadge = (role: string): string => {
  if (role === 'Admin')     return 'Admin';
  if (role === 'Moderator') return 'Mod';
  if (role === 'system')    return 'System';
  return 'Member';
};

// TeamLog Yazıcı 
// Fire-and-forget — hata loglama dışında uygulamayı bloklamaz
const writeTeamLog = (input: TeamLogInput): void => {
  const { icon, iconClass } = LOG_ICON[input.type] || { icon: 'ti-activity', iconClass: 'log-system' };

  prisma.teamLog.create({
    data: {
      teamId:    input.teamId,
      type:      input.type,
      userName:  input.userName,
      role:      input.role,
      badge:     input.badge || roleToBadge(input.role),
      action:    input.action,
      target:    input.target,
      icon:      input.icon      || icon,
      iconClass: input.iconClass || iconClass,
      amount:    input.amount    || null,
      tag:       input.tag       || null,
      tagClass:  input.tagClass  || null,
      details:   input.details   || null,
    },
  }).catch((err: Error) => logger.dbError('TeamLog yazma hatası', err));
};

// UserLog Yazıcı
const writeUserLog = (userId: string, action: string): void => {
  prisma.userLog.create({
    data: { userId, action },
  }).catch((err: Error) => logger.dbError('UserLog yazma hatası', err));
};

// TeamMemberLog Yazıcı
// Frontend TeamMemberLogs yapısıyla uyumlu — date/time ayrımı var
const writeMemberLog = (
  userId: string,
  teamId: string,
  action: string,
  type:   'add' | 'update' | 'delete' | 'settings' | 'trip' | 'expense',
): void => {
  const now  = new Date();
  const date = now.toISOString().split('T')[0];          // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0];         // HH:mm:ss

  prisma.teamLog.create({
    data: {
      teamId,
      type:     `member_action_${type}`,
      userName: userId,
      role:     'Member',
      badge:    'Member',
      action,
      target:   '',
      details:  { userId, date, time, actionType: type },
    },
  }).catch((err: Error) => logger.dbError('TeamMemberLog yazma hatası', err));
};

// Hızlı Fabrika Fonksiyonlar
// expense.service, trip.service vb. için tek satır çağrı

const logExpenseCreated = (teamId: string, userName: string, role: string, title: string, amount: string) =>
  writeTeamLog({ teamId, type: 'expense_add', userName, role, badge: roleToBadge(role),
    action: 'yeni harcama ekledi:', target: title, amount });

const logExpenseApproved = (teamId: string, adminName: string, title: string, amount: string) =>
  writeTeamLog({ teamId, type: 'expense_approve', userName: adminName, role: 'Admin', badge: 'Admin',
    action: 'harcamayı onayladı:', target: title, amount,
    tag: 'Onaylandı', tagClass: 'hi-status-green' });

const logExpenseRejected = (teamId: string, adminName: string, title: string, reason?: string) =>
  writeTeamLog({ teamId, type: 'rejection', userName: adminName, role: 'Admin', badge: 'Admin',
    action: 'harcamayı reddetti:', target: title,
    tag: 'Reddedildi', tagClass: 'hi-status-red',
    details: reason ? { rejection_reason: reason } : undefined });

const logTripCreated = (teamId: string, userName: string, role: string, title: string, destination: string, amount: string) =>
  writeTeamLog({ teamId, type: 'trip_add', userName, role, badge: roleToBadge(role),
    action: 'yeni seyahat ekledi:', target: title, amount,
    details: { destination } });

const logTripApproved = (teamId: string, adminName: string, title: string, destination: string, amount: string) =>
  writeTeamLog({ teamId, type: 'trip_approval', userName: adminName, role: 'Admin', badge: 'Admin',
    action: 'seyahati onayladı:', target: title, amount,
    details: { destination } });

const logTripStatusUpdate = (teamId: string, userName: string, title: string, newStatus: string, destination: string) =>
  writeTeamLog({ teamId, type: 'status_update', userName, role: 'Member', badge: 'Member',
    action: 'şu anda:', target: `${newStatus} (${destination})`,
    tag: newStatus, tagClass: newStatus === 'onroad' ? 'onroad' : 'hi-status-green' });

const logMemberJoined = (teamId: string, adminName: string, newMemberName: string, roleName: string) =>
  writeTeamLog({ teamId, type: 'member_join', userName: adminName, role: 'Admin', badge: 'Admin',
    action: 'yeni üye ekledi:', target: newMemberName,
    tag: 'Yeni Üye', tagClass: 'hi-tag',
    details: { assigned_role: roleName } });

const logMemberRemoved = (teamId: string, adminName: string, memberName: string) =>
  writeTeamLog({ teamId, type: 'member_remove', userName: adminName, role: 'Admin', badge: 'Admin',
    action: 'üyeyi çıkardı:', target: memberName,
    tag: 'Çıkarıldı', tagClass: 'hi-status-red' });

const logRequestApproved = (teamId: string, adminName: string, title: string) =>
  writeTeamLog({ teamId, type: 'request_approve', userName: adminName, role: 'Admin', badge: 'Admin',
    action: 'talebi onayladı:', target: title,
    tag: 'Onaylandı', tagClass: 'hi-status-green' });

const logRequestRejected = (teamId: string, adminName: string, title: string, reason?: string) =>
  writeTeamLog({ teamId, type: 'request_reject', userName: adminName, role: 'Admin', badge: 'Admin',
    action: 'talebi reddetti:', target: title,
    tag: 'Reddedildi', tagClass: 'hi-status-red',
    details: reason ? { rejection_reason: reason } : undefined });

const logUserLogin = (userId: string, email: string) =>
  writeUserLog(userId, `Giriş yapıldı — e-posta: ${email}`);

const logUserLogout = (userId: string) =>
  writeUserLog(userId, 'Oturum kapatıldı');

module.exports = {
  writeTeamLog,
  writeUserLog,
  writeMemberLog,
  logExpenseCreated,
  logExpenseApproved,
  logExpenseRejected,
  logTripCreated,
  logTripApproved,
  logTripStatusUpdate,
  logMemberJoined,
  logMemberRemoved,
  logRequestApproved,
  logRequestRejected,
  logUserLogin,
  logUserLogout,
};
export {};
