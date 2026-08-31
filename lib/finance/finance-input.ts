/** Finance bundle DTOs (browser-safe). */

export type FinanceListItem = {
  id: string;
  bkid?: string;
  custName?: string;
  type: string;
  date?: string;
  month?: string;
  rev?: number;
  cost?: number;
  cashIn?: number;
  cashOut?: number;
  status?: string;
  inv?: string;
  notes?: string;
};

export type ArListItem = {
  id: string;
  bkid?: string;
  custName?: string;
  tour?: string;
  invoiceAmt?: number;
  depositPaid?: number;
  balance?: number;
  dueDate?: string;
  status?: string;
};

export type ApListItem = {
  id: string;
  bkid?: string;
  supplier?: string;
  description?: string;
  amount?: number;
  dueDate?: string;
  status?: string;
  category?: string;
};

export type FinanceBundleResponse = {
  finance: FinanceListItem[];
  ar: ArListItem[];
  ap: ApListItem[];
};
