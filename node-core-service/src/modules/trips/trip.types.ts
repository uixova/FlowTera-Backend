export interface CreateTripInput {
  title:          string;
  category:       string;
  destination:    string;
  vehicle:        string;
  date:           string;
  startDate?:     string;
  endDate?:       string;
  duration?:      string;
  amount:         number;
  currency:       string;
  currencySymbol: string;
  localAmount?:   number;
  localCurrency?: string;
  localSymbol?:   string;
  exchangeRates?: Record<string, number>;
  desc?:          string;
  icon?:          string;
  report?:        string;
  teamId:         string;
}

export interface EnrichedTrip {
  id:              string;
  createdBy:       { id: string; name: string };
  teamId:          string;
  title:           string;
  category:        string;
  destination:     string;
  vehicle:         string;
  date:            Date;
  startDate:       Date | null;
  endDate:         Date | null;
  duration:        string | null;
  amount:          number;
  currency:        string;
  currencySymbol:  string;
  localAmount:     number | null;
  localCurrency:   string | null;
  localSymbol:     string | null;
  exchangeRates:   Record<string, number> | null;
  status:          string;
  statusClass:     string | null;
  rejectionReason: string | null;
  report:          string | null;
  desc:            string | null;
  icon:            string | null;
  // Zenginleştirilmiş alanlar
  userName:        string;
  userAvatar:      string | null;
  userPlan:        string;
}

export {};
