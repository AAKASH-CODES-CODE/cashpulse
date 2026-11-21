import type { AppState, Client, Expense, Invoice } from './types';
import { getInvoiceStatus } from './forecast';
import { daysBetween, daysOverdue, formatDate, formatINR, parseIsoDate, startOfDay } from './money';

/** Window (days) used for "locked" cash: bills falling due within this many days. */
const LOCK_WINDOW_DAYS = 30;

/** Length of the shortest calendar month (February, non-leap). */
const MIN_DAYS_IN_MONTH = 28;

export type KarmaGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface Karma {
  grade: KarmaGrade;
  avgDaysLate: number;
  onTimeRate: number;
  paidCount: number;
  /** True when the client has no paid invoices yet, so grade and onTimeRate are defaults, not history. */
  noHistory: boolean;
  chronicDefaulter: boolean;
  depositAdvice: string | null;
}

export interface SafeToSpend {
  bankBalance: number;
  lockedRent: number;
  lockedTax: number;
  lockedContractor: number;
  safe: number;
}

export interface OverdueBatch {
  invoices: Invoice[];
  total: number;
}

export interface BatchRecoveryTotals {
  total: number;
  discounted: number;
  savings: number;
}

export interface StallResult {
  stallRisk: number;
  signals: string[];
}

export interface UpiUriInput {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  note: string;
}

const STALL_KEYWORDS: readonly string[] = [
  'travel',
  'dubai',
  'meeting',
  'next week',
  'will pay',
  'soon',
  'busy',
  'budget',
  'approval',
  'accounts team',
  'after',
  'check with',
];

/** GST owed on an invoice, rounded to whole rupees. */
export function gstAmountFor(invoice: Invoice): number {
  const rate = invoice.gstRate ?? 0;
  return Math.round((invoice.amount * rate) / 100);
}

/** Invoice amount including GST. */
export function grossFor(invoice: Invoice): number {
  return invoice.amount + gstAmountFor(invoice);
}

function gradeFor(avgDaysLate: number, onTimeRate: number): KarmaGrade {
  if (avgDaysLate <= 0 && onTimeRate === 100) return 'A+';
  if (avgDaysLate <= 3) return 'A';
  if (avgDaysLate <= 7) return 'B';
  if (avgDaysLate <= 15) return 'C';
  if (avgDaysLate <= 30) return 'D';
  return 'F';
}

/** Payment reliability grade for one client, based on paid invoices and open overdue balances. */
export function karmaFor(state: AppState, clientId: string, today: Date): Karma {
  const clientInvoices = state.invoices.filter((inv) => inv.clientId === clientId);
  const paid = clientInvoices.filter((inv) => inv.paidDate !== undefined);
  const paidCount = paid.length;

  let avgDaysLate = 0;
  let onTimeRate = 0;
  let grade: KarmaGrade = 'B';
  if (paidCount > 0) {
    const latenessList = paid.map((inv) =>
      Math.max(0, daysBetween(parseIsoDate(inv.dueDate), parseIsoDate(inv.paidDate ?? inv.dueDate))),
    );
    avgDaysLate = latenessList.reduce((sum, d) => sum + d, 0) / paidCount;
    const onTime = latenessList.filter((d) => d === 0).length;
    onTimeRate = Math.round((onTime / paidCount) * 100);
    grade = gradeFor(avgDaysLate, onTimeRate);
  }

  const hasLongOverdue = clientInvoices.some(
    (inv) => inv.paidDate === undefined && daysOverdue(inv.dueDate, today) > 30,
  );
  const chronicDefaulter = hasLongOverdue || grade === 'D' || grade === 'F';

  let depositAdvice: string | null = null;
  if (chronicDefaulter) {
    depositAdvice = 'Demand an 80% upfront deposit on the next project';
  } else if (grade === 'C') {
    depositAdvice = 'Ask for a 50% deposit';
  }

  return {
    grade,
    avgDaysLate,
    onTimeRate,
    paidCount,
    noHistory: paidCount === 0,
    chronicDefaulter,
    depositAdvice,
  };
}

/** WhatsApp-ready message asking a client for an advance deposit. */
export function negotiationScript(clientName: string, depositPercent: number, amount: number): string {
  const deposit = Math.round((amount * depositPercent) / 100);
  return (
    `Hi ${clientName}, to lock in the next project I need a ${depositPercent}% advance deposit ` +
    `(${formatINR(deposit)} of ${formatINR(amount)}) before I start work. ` +
    `This keeps our timelines on track. Shall I send the payment link?`
  );
}

/** Clamps a day-of-month into 1..daysInMonth. */
export function clampDayOfMonth(day: number, daysInMonth: number): number {
  return Math.min(Math.max(1, day), daysInMonth);
}

/** Clamps a day-of-month to the month length and returns that local date. */
function clampedDate(year: number, month: number, dueDay: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, clampDayOfMonth(dueDay, daysInMonth));
}

/** Next date on or after `start` on which an expense with this dueDay recurs. */
function nextOccurrence(dueDay: number, start: Date): Date {
  const thisMonth = clampedDate(start.getFullYear(), start.getMonth(), dueDay);
  if (thisMonth >= start) return thisMonth;
  return clampedDate(start.getFullYear(), start.getMonth() + 1, dueDay);
}

function isDueWithinWindow(expense: Expense, start: Date): boolean {
  const next = nextOccurrence(expense.dueDay, start);
  const days = daysBetween(start, next);
  return days >= 0 && days <= LOCK_WINDOW_DAYS;
}

function isRent(expense: Expense): boolean {
  return expense.kind === 'rent' || (expense.kind === undefined && /\brent\b/i.test(expense.name));
}

function isTax(expense: Expense): boolean {
  return (
    expense.kind === 'tax' ||
    (expense.kind === undefined && /\b(gst|tax|taxes)\b/i.test(expense.name))
  );
}

function isContractor(expense: Expense): boolean {
  return expense.kind === 'contractor';
}

/**
 * Cash that is free to spend after setting aside upcoming obligations.
 * Rule: bankBalance minus
 *  - rent expenses (kind 'rent', or name containing "Rent") due within the next 30 days,
 *  - tax expenses (kind 'tax', or name containing GST/Tax) due within 30 days, plus GST owed on all unpaid invoices,
 *  - contractor expenses (kind 'contractor') due within 30 days.
 * `safe` may be negative when obligations exceed the bank balance.
 */
export function safeToSpend(state: AppState, today: Date): SafeToSpend {
  const start = startOfDay(today);
  let lockedRent = 0;
  let lockedTax = 0;
  let lockedContractor = 0;

  for (const e of state.expenses) {
    if (!isDueWithinWindow(e, start)) continue;
    if (isRent(e)) lockedRent += e.amount;
    else if (isTax(e)) lockedTax += e.amount;
    else if (isContractor(e)) lockedContractor += e.amount;
  }

  for (const inv of state.invoices) {
    if (inv.paidDate === undefined) lockedTax += gstAmountFor(inv);
  }

  const safe = state.bankBalance - lockedRent - lockedTax - lockedContractor;
  return {
    bankBalance: state.bankBalance,
    lockedRent,
    lockedTax,
    lockedContractor,
    safe,
  };
}

/** Unpaid, past-due invoices sorted by days overdue (most overdue first), with their total. */
export function overdueBatch(state: AppState, today: Date): OverdueBatch {
  const invoices = state.invoices
    .filter((inv) => inv.paidDate === undefined && daysOverdue(inv.dueDate, today) > 0)
    .sort((a, b) => daysOverdue(b.dueDate, today) - daysOverdue(a.dueDate, today));
  const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  return { invoices, total };
}

/** Total owed, the total if each invoice is paid early at a discount, and the difference. */
export function batchRecoveryTotals(invoices: Invoice[], discountPercent: number): BatchRecoveryTotals {
  let total = 0;
  let discounted = 0;
  for (const inv of invoices) {
    total += inv.amount;
    discounted += Math.round(inv.amount * (1 - discountPercent / 100));
  }
  return { total, discounted, savings: total - discounted };
}

/** Scores a client's message for stalling signals. Risk is 0 with no signals, else 20 + 15 per signal (max 95). */
export function stallDetect(text: string): StallResult {
  const lower = text.toLowerCase();
  const signals = STALL_KEYWORDS.filter((kw) => lower.includes(kw));
  const stallRisk = signals.length === 0 ? 0 : Math.min(95, 20 + 15 * signals.length);
  return { stallRisk, signals };
}

/** Firm but polite WhatsApp reply asking the client for a fixed payment date. */
export function counterReply(
  clientName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
): string {
  return (
    `Hi ${clientName}, thank you for the update. Invoice ${invoiceNumber} for ${formatINR(amount)} ` +
    `was due on ${formatDate(dueDate)}. Could you please confirm a fixed payment date by reply, ` +
    `so I can plan accordingly? Thank you.`
  );
}

/**
 * Proposes new recurring days for contractor expenses, shifted by deferDays.
 * newDay is clamped to 28, the shortest month length, so it is valid in every month.
 */
export function contractorDeferral(
  expenses: Expense[],
  deferDays: 5 | 6 | 7,
): { name: string; originalDay: number; newDay: number }[] {
  return expenses
    .filter(isContractor)
    .map((e) => ({
      name: e.name,
      originalDay: e.dueDay,
      newDay: clampDayOfMonth(e.dueDay + deferDays, MIN_DAYS_IN_MONTH),
    }));
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvLine(cells: (string | number)[]): string {
  return cells.map(csvCell).join(',');
}

/** CA-ready CSV: invoices with GST breakdown, then scheduled bills. Plain numbers, no currency symbols. */
export function buildCaCsv(state: AppState, today: Date): string {
  const clientName = (clientId: string): string =>
    state.clients.find((c: Client) => c.id === clientId)?.name ?? '';

  const lines: string[] = [
    csvLine([
      'Invoice No',
      'Client',
      'Project',
      'Issue Date',
      'Due Date',
      'Amount',
      'GST Rate %',
      'GST Amount',
      'Gross',
      'Status',
      'Days Overdue',
      'Paid Date',
      'UTR',
    ]),
  ];

  for (const inv of state.invoices) {
    const days = inv.paidDate === undefined ? daysOverdue(inv.dueDate, today) : 0;
    lines.push(
      csvLine([
        inv.number,
        clientName(inv.clientId),
        inv.project,
        inv.issueDate,
        inv.dueDate,
        inv.amount,
        inv.gstRate ?? 0,
        gstAmountFor(inv),
        grossFor(inv),
        getInvoiceStatus(inv, today),
        days,
        inv.paidDate ?? '',
        inv.utr ?? '',
      ]),
    );
  }

  lines.push('');
  lines.push('Scheduled Bills');
  lines.push(csvLine(['Name', 'Category', 'Amount', 'Due Day']));
  for (const e of state.expenses) {
    lines.push(csvLine([e.name, e.category, e.amount, e.dueDay]));
  }

  return `\uFEFF${lines.join('\n')}`;
}

/** UPI payment deep link with amount fixed to two decimals. */
export function upiUri({ payeeVpa, payeeName, amount, note }: UpiUriInput): string {
  const enc = encodeURIComponent;
  return `upi://pay?pa=${enc(payeeVpa)}&pn=${enc(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${enc(note)}`;
}

/** Route path for the public payment page of an invoice. */
export function publicPayPath(id: string): string {
  return `/pay/${encodeURIComponent(id)}`;
}
