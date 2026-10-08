export type TransactionStatus =
  | 'PENDING' | 'SUCCESS' | 'FAILED'
  | 'PAYOUT_PENDING' | 'PAYOUT_SUCCESS' | 'PAYOUT_ERROR';

export type TransactionType = 'DONATION_ALERT' | 'PLATFORM_SUPPORT' | 'PAYOUT_REQUEST';

export interface Transaction {
  _id: string;
  alertId?: string;
  userId?: string;
  transactionRef: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  paymentLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DonationInitiateDto {
  alertId: string;
  amount: number;
  phone: string;
  userId?: string;
}

export interface SupportInitiateDto {
  amount: number;
  phone: string;
  userId?: string;
}

export interface PayoutRequestDto {
  alertId: string;
  amount: number;
  accountBankCode: 'MTN' | 'ORANGEMONEY';
  accountNumber: string;
  receiverName: string;
}

export interface PaymentInitiateResponse {
  paymentLink: string;
  transactionRef: string;
  transactionId: string;
}

export interface Cagnotte {
  _id: string;
  title: string;
  type: string;
  location: string;
  targetAmount?: number;
  raisedAmount: number;
  withdrawnAmount: number;
  availableAmount: number;
  createdAt: string;
}
