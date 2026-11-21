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
    pillClassName: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    dotClassName: 'bg-emerald-400',
  },
  pending: {
    label: 'Pending',
    pillClassName: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
    dotClassName: 'bg-zinc-300',
  },
  overdue: {
    label: 'Overdue',
    pillClassName: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
    dotClassName: 'bg-rose-400 motion-safe:animate-pulse',
  },
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950';

const ACTION_BASE = `tap-press inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer active:scale-95 hover:scale-105 ${FOCUS_RING}`;

const GHOST_ACTION = `${ACTION_BASE} text-zinc-400 hover:bg-white/10 hover:text-zinc-50`;
const CHASE_ACTION = `${ACTION_BASE} text-emerald-400 hover:bg-emerald-500/15 hover:shadow-sm hover:shadow-emerald-500/20`;

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
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400 transition-colors">
        No invoices in this view.
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-900/90 text-[11px] uppercase tracking-wide text-zinc-500 backdrop-blur">
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
                    className={`cp-animate-in group border-b border-white/5 transition-colors duration-200 last:border-b-0 ${
                      selected ? 'bg-emerald-500/5' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-zinc-50">{row.clientName}</p>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500">{row.project}</td>
                    <td className="px-4 py-3.5 text-zinc-400">{formatDate(row.dueDate)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-zinc-50">
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
              className={`cp-animate-in rounded-2xl border border-white/5 p-4 transition-colors duration-200 ${
                selected ? 'bg-emerald-500/5 ring-1 ring-inset ring-emerald-500/30' : 'bg-zinc-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-50">{row.clientName}</p>
                  <p className="truncate text-xs text-zinc-500">{row.project}</p>
                </div>
                <p className="shrink-0 text-lg font-semibold tabular-nums text-zinc-50">
                  {formatINR(row.amount)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-400">Due {formatDate(row.dueDate)}</p>
                <StatusBadge status={status} />
              </div>
              <div className="mt-4 border-t border-white/5 pt-3">
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
