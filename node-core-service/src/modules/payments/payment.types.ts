// ─── Stripe Entegrasyon Tipleri ───────────────────────────────────────────────

export type PaymentStatusType = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';

export interface CreateIntentInput {
  planId: string;
}

export interface CreateIntentResult {
  clientSecret:    string;
  paymentIntentId: string;
  amount:          number;
  currency:        string;
  planName:        string;
  simulationMode:  boolean;
}

export interface WebhookResult {
  received: boolean;
}

export interface PaymentRecord {
  id:                    string;
  userId:                string;
  planId:                string;
  amount:                number;
  currency:              string;
  status:                PaymentStatusType;
  stripePaymentIntentId: string | null;
  stripeCustomerId:      string | null;
  planName:              string | null;
  cardLastFour:          string | null;
  cardBrand:             string | null;
  failureReason:         string | null;
  metadata:              Record<string, any> | null;
  createdAt:             Date;
  updatedAt:             Date;
}

export interface RefundResult {
  success: boolean;
  message: string;
}

export {};
