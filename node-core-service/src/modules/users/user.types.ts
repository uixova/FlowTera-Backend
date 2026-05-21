export interface UserSubscription {
  planId:            string;
  plan:              string;
  maxTeams:          number;
  maxMembersPerTeam: number;
  usage:             { ocr: number; aiAnaliz: number };
  feature_keys?:     string[];
}

export interface UserSettings {
  theme:         string;
  language:      string;
  notifications: { email: boolean; sms: boolean; push: boolean };
}

export interface UserRole {
  teamId:      string;
  roleName:    'Admin' | 'Moderator' | 'Member';
  permissions: string[];
}

export interface MappedUser {
  id:           string;
  name:         string;
  username:     string;
  email:        string;
  avatar:       string | null;
  phone:        string | null;
  address:      string | null;
  age:          number | null;
  joinedDate:   Date;
  lastLogin:    Date | null;
  status:       'active' | 'inactive';
  isDeleted:    boolean;
  subscription: UserSubscription;
  settings:     UserSettings;
  role:         UserRole[];
  teams:        string[];
}

export {};
