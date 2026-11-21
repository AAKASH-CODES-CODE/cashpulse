export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  /** Advance deposit percentage demanded from this client, if set. */
  depositPolicy?: number;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue';

export type GstRate = 0 | 5 | 12 | 18 | 28;

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  project: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  gstRate?: GstRate;
  deliverables?: string[];
  milestoneLocked?: boolean;
  /** Bank UTR / reference number recorded for the payment. */
  utr?: string;
}

export type ExpenseKind = 'rent' | 'tax' | 'contractor' | 'software' | 'cloud' | 'other';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  /** Day of month the expense recurs on (1-31). */
  dueDay: number;
  category: string;
  kind?: ExpenseKind;
}

export interface Scenario {
  invoiceId?: string;
  clientId?: string;
  delayDays: number;
  defaulted?: boolean;
}

export type Plan = 'free' | 'pro';

export interface AppState {
  clients: Client[];
  invoices: Invoice[];
  expenses: Expense[];
  bankBalance: number;
  plan: Plan;
  /** Invoices issued per 'YYYY-MM' (issueDate month). Survives deletions; optional for older saved data. */
  issuedCounts?: Record<string, number>;
  updatedAt: string;
}
