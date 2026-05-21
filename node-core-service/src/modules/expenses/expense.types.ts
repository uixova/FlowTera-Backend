export interface CreateExpenseInput {
  title:          string;
  category:       string;
  merchant:       string;
  date:           string;
  amount:         number;
  currency:       string;
  currencySymbol: string;
  localAmount?:   number;
  localCurrency?: string;
  localSymbol?:   string;
  exchangeRates?: Record<string, number>;
  paymentMethod?: string;
  desc?:          string;
  icon?:          string;
  teamId:         string;
}

export interface EnrichedExpense {
  id:             string;
  createdBy:      { id: string; name: string };
  teamId:         string;
  title:          string;
  category:       string;
  merchant:       string;
  date:           Date;
  amount:         number;
  currency:       string;
  currencySymbol: string;
  localAmount:    number | null;
  localCurrency:  string | null;
  localSymbol:    string | null;
  exchangeRates:  Record<string, number> | null;
  paymentMethod:  string | null;
  status:         'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  desc:           string | null;
  icon:           string | null;
  report:         string | null;
  isReported:     boolean;
  receipt:        string | null;
  // Zenginleştirilmiş alanlar
  user:           string;
  userAvatar:     string | null;
  userRole:       string;
}

export {};
