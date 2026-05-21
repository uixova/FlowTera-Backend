export interface TeamSettings {
  currency:          string;
  workspaceType:     string;
  privacy:           string;
  maxExpenseLimit:   number;
  memberLimit:       number;
  status:            string;
  autoApproved:      boolean;
  autoApprovedLimit: number;
  planContext?:      PlanContext;
}

export interface PlanContext {
  planId:            string;
  planName:          string;
  maxMembersAllowed: number;
  isPlanFixed:       boolean;
}

export interface CreateTeamInput {
  name:     string;
  category: string;
  image?:   string;
  ownerId:  string;
  settings?: Partial<TeamSettings>;
}

export interface NormalizedMember {
  id:          string;
  name:        string;
  avatar:      string | null;
  email:       string;
  isDeleted:   boolean;
  lastLogin?:  string | null;
  roleName:    string;
  permissions: string[];
}

export interface TeamSettingsResult {
  adminPlanLimit:    number;
  ownerPlanType:     string;
  availableFeatures: string[];
  planDetails:       any | null;
  [key: string]:     any;
}

export {};
