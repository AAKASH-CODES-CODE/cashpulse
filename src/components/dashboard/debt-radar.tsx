import { agingBucket, type AgingBucket } from '../../lib/forecast';
import { daysOverdue, formatDate, formatINR } from '../../lib/money';
import type { AppState, Invoice } from '../../lib/types';

export interface DebtRadarProps {
  state: AppState;
  today: Date;
  onChase: (invoiceId: string) => void;
}

interface ClientDebt {
  clientId: string;
  name: string;
  total: number;
  oldest: Invoice;
}

const BADGE_CLASSES: Record<AgingBucket, string> = {
  current: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30',
  aging: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30',
  critical: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30',
};

function buildClientDebts(state: AppState): ClientDebt[] {
  const byClient = new Map<string, ClientDebt>();
  for (const inv of state.invoices) {
    if (inv.paidDate !== undefined) continue;
    const existing = byClient.get(inv.clientId);
    if (existing === undefined) {
      const name = state.clients.find((c) => c.id === inv.clientId)?.name ?? 'Unknown client';
      byClient.set(inv.clientId, { clientId: inv.clientId, name, total: inv.amount, oldest: inv });
      continue;
    }
    existing.total += inv.amount;
    if (inv.dueDate < existing.oldest.dueDate) existing.oldest = inv;
  }
  return [...byClient.values()].sort((a, b) => b.total - a.total);
}

export function DebtRadar({ state, today, onChase }: DebtRadarProps) {
  const debts = buildClientDebts(state);

  if (debts.length === 0) {
    return (
      <section
        aria-label="Debt radar"
        className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 text-center"
      >
        <h3 className="text-base font-semibold text-zinc-100">Debt Radar</h3>
        <p className="mt-2 text-sm text-zinc-400">No unpaid invoices. Every client is square.</p>
      </section>
    );
  }

  return (
    <section aria-label="Debt radar" className="cp-animate-in flex flex-col gap-4">
      <h3 className="text-base font-semibold text-zinc-100">Debt Radar</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {debts.map((debt, index) => {
          const days = daysOverdue(debt.oldest.dueDate, today);
          const bucket = agingBucket(days);
          return (
            <article
              key={debt.clientId}
              style={{ animationDelay: `${index * 60}ms` }}
              className="cp-animate-in flex flex-col gap-3 rounded-2xl border border-white/5 bg-zinc-900/60 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">{debt.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Oldest invoice due {formatDate(debt.oldest.dueDate)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${BADGE_CLASSES[bucket]}`}
                >
                  {days > 0 ? `${days} days overdue` : 'Not yet due'}
                </span>
              </div>
              <p className="text-xl font-semibold tabular-nums text-zinc-50">{formatINR(debt.total)}</p>
              <button
                type="button"
                onClick={() => onChase(debt.oldest.id)}
                className="tap-press group flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 active:scale-95 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              >
                <span className="transition-transform duration-200 ease-out group-hover:scale-105">Chase on WhatsApp</span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
