import { AlertTriangle, Check, MessageCircle } from 'lucide-react';
import { getInvoiceStatus } from '../../lib/forecast';
import { daysOverdue, formatINR } from '../../lib/money';
import type { InvoiceRow } from './invoices-table';

interface ActionBannerProps {
  rows: InvoiceRow[];
  today: Date;
  onChase: (invoiceId: string) => void;
}

export function ActionBanner({ rows, today, onChase }: ActionBannerProps) {
  const overdue = rows
    .filter((row) => getInvoiceStatus(row, today) === 'overdue')
    .sort(
      (a, b) =>
        daysOverdue(b.dueDate, today) - daysOverdue(a.dueDate, today) || b.amount - a.amount,
    );
  const top = overdue[0];

  if (!top) {
    return (
      <section
        aria-label="Action status"
        className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-[0_0_40px_-16px_rgba(52,211,153,0.35)] transition-[background-color,box-shadow] duration-200 ease-out"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
          <Check className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold text-emerald-800">All clear</h2>
          <p className="text-sm text-emerald-700">
            No invoices are overdue. Your cash is flowing.
          </p>
        </div>
      </section>
    );
  }

  const daysLate = daysOverdue(top.dueDate, today);

  return (
    <section
      aria-label="Action required today"
      className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-[0_0_40px_-16px_rgba(251,113,133,0.45)] transition-[background-color,box-shadow] duration-200 ease-out sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-200 pulse-subtle">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
            Action Required Today
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">
            {top.clientName} owes {formatINR(top.amount)}
          </h2>
          <p className="text-sm text-slate-600">
            Invoice {top.number} · {daysLate} {daysLate === 1 ? 'day' : 'days'} late
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChase(top.id)}
        className="tap-bounce group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 hover:shadow-lg hover:shadow-rose-900/40 hover:from-rose-700 hover:to-rose-800 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <MessageCircle className="h-4 w-4 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-6" aria-hidden="true" />
        <span>Chase Today</span>
      </button>
    </section>
  );
}
