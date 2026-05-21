export interface LoginPayload {
  email:    string;
  password: string;
}

export interface VerifyPayload {
  email: string;
  code:  string;
}

export interface SignupPayload {
  name:         string;
  username:     string;
  email:        string;
  phone?:       string;
  age?:         number;
  address?:     string;
  password:     string;
  subscription?: {
    planId:            string;
    plan:              string;
    maxTeams:          number;
    maxMembersPerTeam: number;
    usage:             { ocr: number; aiAnaliz: number };
    feature_keys?:     string[];
  };
}

export interface JwtPayload {
  userId: string;
  email:  string;
}

export {};
