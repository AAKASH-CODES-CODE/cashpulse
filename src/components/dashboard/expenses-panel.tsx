import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import { daysBetween, formatDate, formatINR, toIsoDate } from '../../lib/money';
import type { Expense } from '../../lib/types';

interface ExpensesPanelProps {
  expenses: Expense[];
  today: Date;
  onEdit?: (expenseId: string) => void;
  onDelete?: (expenseId: string) => void;
}

/** Date of dueDay in the given month, clamped to the month's length. */
function dueInMonth(dueDay: number, year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(dueDay, length));
}

function nextDueDate(dueDay: number, today: Date): Date {
  const thisMonth = dueInMonth(dueDay, today.getFullYear(), today.getMonth());
  if (daysBetween(today, thisMonth) >= 0) return thisMonth;
  return dueInMonth(dueDay, today.getFullYear(), today.getMonth() + 1);
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function dueLabel(due: Date, today: Date): string {
  const days = daysBetween(today, due);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Next: ${formatDate(toIsoDate(due))} · in ${days} days`;
}

const ICON_BUTTON =
  'tap-press inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 active:scale-90 hover:scale-110 hover:bg-white/[0.08] hover:text-zinc-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950';

export function ExpensesPanel({ expenses, today, onEdit, onDelete }: ExpensesPanelProps) {
  const items = expenses
    .map((expense) => ({ expense, due: nextDueDate(expense.dueDay, today) }))
    .sort((a, b) => a.due.getTime() - b.due.getTime());
  const monthlyTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <section
      aria-labelledby="expenses-heading"
      className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 bg-gradient-to-br from-white/[0.03] to-transparent p-5 md:p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_8px_24px_-12px_rgba(0,0,0,0.6)] transition-[transform,background-color,box-shadow] duration-200 ease-out"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="expenses-heading" className="text-base font-semibold text-zinc-50">
            Upcoming Bills / Expenses
          </h2>
          <p className="text-xs text-zinc-500">Monthly total {formatINR(monthlyTotal)}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-300 ring-1 ring-white/5">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
          No recurring bills yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/5">
          {items.map(({ expense, due }, index) => (
            <li
              key={expense.id}
              style={{ animationDelay: `${index * 60}ms` }}
              className="cp-animate-in group flex items-center justify-between gap-3 rounded-xl py-3 transition-[background-color] duration-200 ease-out first:pt-0 last:pb-0 hover:bg-white/[0.04]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-50">{expense.name}</p>
                  <p className="text-xs text-zinc-500">
                    {expense.category} · Due on the {ordinal(expense.dueDay)} of each month
                  </p>
                  <p className="text-xs font-medium text-zinc-400">{dueLabel(due, today)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="mr-1 text-sm font-semibold tabular-nums text-zinc-50">
                  {formatINR(expense.amount)}
                </span>
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(expense.id)}
                        aria-label={`Edit ${expense.name}`}
                        className={ICON_BUTTON}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(expense.id)}
                        aria-label={`Delete ${expense.name}`}
                        className={`${ICON_BUTTON} hover:bg-rose-400/10 hover:text-rose-400`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
