import { Check, MessageCircle, Pencil } from 'lucide-react';
import { getInvoiceStatus } from '../../lib/forecast';
import { formatDate, formatINR } from '../../lib/money';
import type { Invoice, InvoiceStatus } from '../../lib/types';

export type InvoiceRow = Invoice & { clientName: string };

interface InvoicesTableProps {
  rows: InvoiceRow[];
  today: Date;
  selectedId?: string | null;
  onMarkPaid: (id: string) => void;
  onEdit: (id: string) => void;
  onChase: (id: string) => void;
}

const STATUS_BADGE: Record<
  InvoiceStatus,
  { label: string; pillClassName: string; dotClassName: string }
> = {
  paid: {
    label: 'Paid',
    pillClassName: 'border-emerald-500/20 bg-emerald-50 text-emerald-700',
    dotClassName: 'bg-emerald-600',
  },
  pending: {
    label: 'Pending',
    pillClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    dotClassName: 'bg-slate-400',
  },
  overdue: {
    label: 'Overdue',
    pillClassName: 'border-rose-200 bg-rose-50 text-rose-700',
    dotClassName: 'bg-rose-600 motion-safe:animate-pulse',
  },
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const ACTION_BASE = `tap-press inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer active:scale-95 hover:scale-105 ${FOCUS_RING}`;

const GHOST_ACTION = `${ACTION_BASE} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
const CHASE_ACTION = `${ACTION_BASE} text-emerald-700 hover:bg-emerald-50 hover:shadow-xs`;

interface RowActionsProps {
  row: InvoiceRow;
  status: InvoiceStatus;
  variant: 'row' | 'card';
  onMarkPaid: (id: string) => void;
  onEdit: (id: string) => void;
  onChase: (id: string) => void;
}

function RowActions({ row, status, variant, onMarkPaid, onEdit, onChase }: RowActionsProps) {
  const isPaid = status === 'paid';
  const wrapperClassName =
    variant === 'card'
      ? 'grid grid-cols-3 gap-2'
      : 'flex flex-wrap items-center justify-end gap-1 md:opacity-0 md:transition-all md:duration-200 md:group-hover:opacity-100 md:group-focus-within:opacity-100';
  const cardButtonClassName = variant === 'card' ? 'w-full justify-center' : '';
  return (
    <div className={wrapperClassName}>
      {!isPaid && (
        <button
          type="button"
          onClick={() => onMarkPaid(row.id)}
          className={`${GHOST_ACTION} ${cardButtonClassName} group/btn`}
        >
          <Check className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:scale-125" aria-hidden="true" />
          Mark as Paid
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(row.id)}
        className={`${GHOST_ACTION} ${cardButtonClassName} group/btn`}
      >
        <Pencil className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:rotate-12 group-hover/btn:scale-110" aria-hidden="true" />
        Edit
      </button>
      {!isPaid && (
        <button
          type="button"
          onClick={() => onChase(row.id)}
          className={`${CHASE_ACTION} ${cardButtonClassName} group/btn`}
        >
          <MessageCircle className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:scale-125 group-hover/btn:rotate-6" aria-hidden="true" />
          1-Click Chase
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const badge = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.pillClassName}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${badge.dotClassName}`}
      />
      {badge.label}
    </span>
  );
}

export function InvoicesTable({
  rows,
  today,
  selectedId = null,
  onMarkPaid,
  onEdit,
  onChase,
}: InvoicesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 transition-colors">
        No invoices in this view.
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/90 text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200 backdrop-blur">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Client</th>
                <th scope="col" className="px-4 py-3 font-medium">Project</th>
                <th scope="col" className="px-4 py-3 font-medium">Due Date</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const status = getInvoiceStatus(row, today);
                const selected = row.id === selectedId;
                return (
                  <tr
                    key={row.id}
                    style={{ animationDelay: `${index * 60}ms` }}
                    className={`cp-animate-in group border-b border-slate-100 transition-colors duration-200 last:border-b-0 ${
                      selected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900">{row.clientName}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{row.project}</td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(row.dueDate)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                      {formatINR(row.amount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        row={row}
                        status={status}
                        variant="row"
                        onMarkPaid={onMarkPaid}
                        onEdit={onEdit}
                        onChase={onChase}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row, index) => {
          const status = getInvoiceStatus(row, today);
          const selected = row.id === selectedId;
          return (
            <li
              key={row.id}
              style={{ animationDelay: `${index * 60}ms` }}
              className={`cp-animate-in rounded-2xl border border-slate-200 p-4 transition-colors duration-200 ${
                selected ? 'bg-emerald-50/40 ring-1 ring-inset ring-emerald-500/30' : 'bg-white shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{row.clientName}</p>
                  <p className="truncate text-xs text-slate-500">{row.project}</p>
                </div>
                <p className="shrink-0 text-lg font-semibold tabular-nums text-slate-900">
                  {formatINR(row.amount)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Due {formatDate(row.dueDate)}</p>
                <StatusBadge status={status} />
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <RowActions
                  row={row}
                  status={status}
                  variant="card"
                  onMarkPaid={onMarkPaid}
                  onEdit={onEdit}
                  onChase={onChase}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
