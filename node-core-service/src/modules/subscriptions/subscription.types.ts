// Frontend types.ts UserSubscription ile uyumlu

export interface UserSubscriptionUsage {
  ocr:      number;
  aiAnaliz: number;
}

export interface UserSubscription {
  planId:            string;
  plan:              string;
  maxTeams:          number;
  maxMembersPerTeam: number;
  usage:             UserSubscriptionUsage;
  feature_keys:      string[];
}

export interface SubscriptionWithPlan extends UserSubscription {
  planName:    string;
  planDetails: any | null;
}

export interface UpgradePayload {
  planId: string;
}

export {};
