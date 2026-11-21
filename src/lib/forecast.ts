import type { AppState, Expense, Invoice, InvoiceStatus, Scenario } from './types';
import { addDays, daysOverdue, formatDate, formatINR, parseIsoDate, startOfDay, toIsoDate } from './money';

export type AgingBucket = 'current' | 'aging' | 'critical';
export type AgingSummary = Record<AgingBucket, { count: number; amount: number }>;

export interface Totals {
  outstanding: number;
  overdue: number;
  clientsWithOutstanding: number;
}

export interface ForecastPoint {
  date: string;
  balance: number;
  inflow: number;
  outflow: number;
}

export type DangerLevel = 'danger' | 'warning' | 'safe';

export const RUNWAY_HORIZON_DAYS = 90;
export const BUFFER_INR = 20000;

export function getInvoiceStatus(invoice: Invoice, today: Date = new Date()): InvoiceStatus {
  if (invoice.paidDate) return 'paid';
  return daysOverdue(invoice.dueDate, today) > 0 ? 'overdue' : 'pending';
}

export function agingBucket(daysOverdueCount: number): AgingBucket {
  if (daysOverdueCount <= 15) return 'current';
  if (daysOverdueCount <= 30) return 'aging';
  return 'critical';
}

function unpaidInvoices(state: AppState): Invoice[] {
  return state.invoices.filter((inv) => !inv.paidDate);
}

export function getAgingSummary(state: AppState, today: Date = new Date()): AgingSummary {
  const summary: AgingSummary = {
    current: { count: 0, amount: 0 },
    aging: { count: 0, amount: 0 },
    critical: { count: 0, amount: 0 },
  };
  for (const inv of unpaidInvoices(state)) {
    const bucket = agingBucket(daysOverdue(inv.dueDate, today));
    summary[bucket].count += 1;
    summary[bucket].amount += inv.amount;
  }
  return summary;
}

export function getTotals(state: AppState, today: Date = new Date()): Totals {
  const unpaid = unpaidInvoices(state);
  let outstanding = 0;
  let overdue = 0;
  for (const inv of unpaid) {
    outstanding += inv.amount;
    if (getInvoiceStatus(inv, today) === 'overdue') overdue += inv.amount;
  }
  return {
    outstanding,
    overdue,
    clientsWithOutstanding: new Set(unpaid.map((inv) => inv.clientId)).size,
  };
}

function daysInMonthOf(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** True when the expense recurs on this calendar day (dueDay clamped to month length). */
function isExpenseDue(expense: Expense, day: Date): boolean {
  return day.getDate() === Math.min(expense.dueDay, daysInMonthOf(day));
}

function isTargeted(invoice: Invoice, scenario: Scenario): boolean {
  return (
    (scenario.invoiceId !== undefined && invoice.id === scenario.invoiceId) ||
    (scenario.clientId !== undefined && invoice.clientId === scenario.clientId)
  );
}

export function buildForecast(
  state: AppState,
  days: 30 | 60 | 90,
  scenario?: Scenario,
  today: Date = new Date(),
): ForecastPoint[] {
  const start = startOfDay(today);
  const inflows = new Map<string, number>();

  for (const inv of unpaidInvoices(state)) {
    const targeted = scenario ? isTargeted(inv, scenario) : false;
    if (targeted && scenario?.defaulted) continue;

    const delay = targeted && scenario ? scenario.delayDays : 0;
    const base =
      getInvoiceStatus(inv, start) === 'overdue' ? start : parseIsoDate(inv.dueDate);
    const key = toIsoDate(addDays(base, delay));
    inflows.set(key, (inflows.get(key) ?? 0) + inv.amount);
  }

  let balance = state.bankBalance;
  const points: ForecastPoint[] = [];
  for (let offset = 0; offset <= days; offset++) {
    const day = addDays(start, offset);
    const key = toIsoDate(day);
    const inflow = inflows.get(key) ?? 0;
    const outflow = state.expenses.reduce(
      (sum, e) => sum + (isExpenseDue(e, day) ? e.amount : 0),
      0,
    );
    balance += inflow - outflow;
    points.push({ date: key, balance, inflow, outflow });
  }
  return points;
}

/** Index of the first forecast day with a negative balance within the horizon, or -1 when there is none. */
function firstBreachIndex(state: AppState, today: Date): number {
  const points = buildForecast(state, RUNWAY_HORIZON_DAYS, undefined, today);
  return points.findIndex((p) => p.balance < 0);
}

/** Days until the balance first drops below 0 within 90 days, else 90. Check runwayIsCapped for the "90+" case. */
export function cashRunwayDays(state: AppState, today: Date = new Date()): number {
  const idx = firstBreachIndex(state, today);
  return idx === -1 ? RUNWAY_HORIZON_DAYS : idx;
}

/** True when no breach occurs within the horizon, so cashRunwayDays' 90 is a floor ("90+"), not a measured day. */
export function runwayIsCapped(state: AppState, today: Date = new Date()): boolean {
  return firstBreachIndex(state, today) === -1;
}

export function dangerLevel(balance: number): DangerLevel {
  if (balance < 0) return 'danger';
  if (balance < BUFFER_INR) return 'warning';
  return 'safe';
}

function targetName(state: AppState, scenario: Scenario): string {
  const clientId =
    scenario.clientId ??
    state.invoices.find((inv) => inv.id === scenario.invoiceId)?.clientId;
  return state.clients.find((c) => c.id === clientId)?.name ?? 'A client';
}

export function scenarioAlert(state: AppState, scenario: Scenario, today: Date = new Date()): string {
  const points = buildForecast(state, RUNWAY_HORIZON_DAYS, scenario, today);
  const breach = points.find((p) => p.balance < 0);
  if (!breach) {
    return '✅ No cash breach in the next 90 days under this scenario.';
  }

  const name = targetName(state, scenario);
  const breachDay = parseIsoDate(breach.date);
  const dueExpense = state.expenses.find((e) => isExpenseDue(e, breachDay));
  const largest = state.expenses.reduce<Expense | undefined>(
    (max, e) => (max === undefined || e.amount > max.amount ? e : max),
    undefined,
  );
  const dayLabel = dueExpense ? ` (${dueExpense.name} Day)` : '';
  const cause = scenario.defaulted
    ? `If ${name} defaults`
    : `If ${name} pays ${scenario.delayDays} days late`;
  const delayTarget = dueExpense ?? largest;
  const delayLabel = delayTarget ? delayTarget.name : 'your largest expense';

  return (
    `⚠️ ${cause}, your cash balance will hit ${formatINR(breach.balance)} on ${formatDate(breach.date)}${dayLabel}. ` +
    `Recommendation: Chase ${name} today with a 3% early-pay discount, or delay ${delayLabel} by 7 days.`
  );
}
