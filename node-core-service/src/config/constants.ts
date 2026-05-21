const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 200;

const ROLES = {
  ADMIN:     'Admin',
  MODERATOR: 'Moderator',
  MEMBER:    'Member',
} as const;

const DEFAULT_SUBSCRIPTION = {
  planId:            '',
  plan:              'free',
  maxTeams:          1,
  maxMembersPerTeam: 5,
  usage:             { ocr: 0, aiAnaliz: 0 },
  feature_keys:      [] as string[],
};

const DEFAULT_SETTINGS = {
  theme:         'light',
  language:      'tr',
  notifications: { email: true, sms: false, push: true },
};

module.exports = { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ROLES, DEFAULT_SUBSCRIPTION, DEFAULT_SETTINGS };
export {};
