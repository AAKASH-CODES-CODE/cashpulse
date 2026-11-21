import type { AppState, Client, Expense, Invoice, Plan } from './types';
import { createSeedState } from './seed';
import { toIsoDate } from './money';

export const STORAGE_KEY = 'cashpulse:v1';
export const CORRUPT_BACKUP_KEY = 'cashpulse:v1:corrupt-backup';
export const STORE_CHANGE_EVENT = 'cashpulse-store-change';

/** Free plan: maximum invoices issued per calendar month. */
const FREE_PLAN_MONTHLY_LIMIT = 3;

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function isAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<Record<keyof AppState, unknown>>;
  return (
    Array.isArray(v.clients) &&
    Array.isArray(v.invoices) &&
    Array.isArray(v.expenses) &&
    typeof v.bankBalance === 'number' &&
    (v.plan === 'free' || v.plan === 'pro') &&
    typeof v.updatedAt === 'string'
  );
}

/** Returns true when the state was persisted; false when storage is unavailable or full. */
export function saveState(state: AppState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage unavailable: caller keeps the in-memory state.
    return false;
  }
  window.dispatchEvent(new Event(STORE_CHANGE_EVENT));
  return true;
}

/** Parses a raw stored value without writing anything; null when missing or not a valid AppState. */
export function parseStoredState(raw: string | null): AppState | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAppState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Keeps unreadable saved data under a separate key so that reseeding does not destroy it. */
function backupCorruptState(raw: string): void {
  try {
    window.localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
  } catch {
    // Backup failed; reseeding still proceeds.
  }
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return createSeedState();
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: fall through to seed.
  }
  const stored = parseStoredState(raw);
  if (stored !== null) return stored;
  if (raw !== null) backupCorruptState(raw);
  const seed = createSeedState();
  saveState(seed);
  return seed;
}

export function resetDemoData(): AppState {
  const seed = createSeedState();
  saveState(seed);
  return seed;
}

function touch(state: AppState, patch: Partial<AppState>): AppState {
  return { ...state, ...patch, updatedAt: new Date().toISOString() };
}

export function addClient(state: AppState, input: { name: string; whatsapp: string }): AppState {
  const client: Client = { id: createId('cli'), name: input.name, whatsapp: input.whatsapp };
  return touch(state, { clients: [...state.clients, client] });
}

/** True only for a YYYY-MM-DD string that names a real calendar day. */
function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) return false;
  // Rejects rollovers such as 2024-02-30, which Date would otherwise accept.
  return new Date(time).toISOString().slice(0, 10) === value;
}

/** Returns an error message for an invalid invoice, or null when it is valid. */
export function validateInvoiceInput(
  input: Pick<Invoice, 'amount' | 'issueDate' | 'dueDate' | 'clientId'>,
  state: AppState,
): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return 'Amount must be a positive number.';
  }
  if (!isRealIsoDate(input.issueDate) || !isRealIsoDate(input.dueDate)) {
    return 'Issue and due dates must be valid dates.';
  }
  if (input.dueDate < input.issueDate) {
    return 'Due date cannot be before the issue date.';
  }
  if (!state.clients.some((c) => c.id === input.clientId)) {
    return 'Select a valid client.';
  }
  return null;
}

/** Returns an error message for an invalid expense, or null when it is valid. */
export function validateExpenseInput(input: Pick<Expense, 'amount' | 'dueDay'>): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return 'Amount must be a positive number.';
  }
  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
    return 'Due day must be a whole number from 1 to 31.';
  }
  return null;
}

/** Free-plan check for invoices issued in `month` ('YYYY-MM'). Pro plan is never limited. */
function canIssueInMonth(state: AppState, month: string): boolean {
  if (state.plan === 'pro') return true;
  const liveCount = state.invoices.filter((inv) => inv.issueDate.startsWith(month)).length;
  const issuedCount = state.issuedCounts?.[month] ?? 0;
  return Math.max(issuedCount, liveCount) < FREE_PLAN_MONTHLY_LIMIT;
}

/** Returns state unchanged when the invoice is invalid or the free-plan limit for its issue month is reached. */
export function addInvoice(state: AppState, invoice: Invoice): AppState {
  if (validateInvoiceInput(invoice, state) !== null) return state;
  const month = invoice.issueDate.slice(0, 7);
  if (!canIssueInMonth(state, month)) return state;
  const issuedCounts = {
    ...state.issuedCounts,
    [month]: (state.issuedCounts?.[month] ?? 0) + 1,
  };
  return touch(state, { invoices: [...state.invoices, invoice], issuedCounts });
}

/** Returns state unchanged when the invoice fails the same validation as addInvoice. */
export function updateInvoice(state: AppState, invoice: Invoice): AppState {
  if (validateInvoiceInput(invoice, state) !== null) return state;
  return touch(state, {
    invoices: state.invoices.map((inv) => (inv.id === invoice.id ? invoice : inv)),
  });
}

/** Marks an invoice paid on `today`; stores the bank UTR when one is given. */
export function markInvoicePaid(
  state: AppState,
  id: string,
  today: Date = new Date(),
  utr?: string,
): AppState {
  return touch(state, {
    invoices: state.invoices.map((inv) =>
      inv.id === id
        ? { ...inv, paidDate: toIsoDate(today), ...(utr === undefined ? {} : { utr }) }
        : inv,
    ),
  });
}

export function deleteInvoice(state: AppState, id: string): AppState {
  return touch(state, { invoices: state.invoices.filter((inv) => inv.id !== id) });
}

/** Returns state unchanged when the expense has a non-positive amount or an invalid dueDay. */
export function addExpense(state: AppState, expense: Expense): AppState {
  if (validateExpenseInput(expense) !== null) return state;
  return touch(state, { expenses: [...state.expenses, expense] });
}

/** Returns state unchanged when the expense has a non-positive amount or an invalid dueDay. */
export function updateExpense(state: AppState, expense: Expense): AppState {
  if (validateExpenseInput(expense) !== null) return state;
  return touch(state, {
    expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)),
  });
}

export function deleteExpense(state: AppState, id: string): AppState {
  return touch(state, { expenses: state.expenses.filter((e) => e.id !== id) });
}

export function setBankBalance(state: AppState, balance: number): AppState {
  return touch(state, { bankBalance: balance });
}

export function setPlan(state: AppState, plan: Plan): AppState {
  return touch(state, { plan });
}

/**
 * Free plan allows 3 invoices per calendar month (counted by issueDate), for the month of `now`.
 * Uses the larger of the persisted issue counter and the live invoice count,
 * so deleting an invoice does not free up a slot.
 */
export function canCreateInvoice(state: AppState, now: Date = new Date()): boolean {
  return canIssueInMonth(state, toIsoDate(now).slice(0, 7));
}
