import { AlertTriangle, Receipt, Timer, Wallet, type LucideIcon } from 'lucide-react';
import { formatINR } from '../../lib/money';
import { RUNWAY_HORIZON_DAYS, cashRunwayDays, getTotals } from '../../lib/forecast';
import type { AppState } from '../../lib/types';
import type { MetricKey } from './metric-detail-drawer';

type Tone = 'positive' | 'neutral' | 'risk';

interface MetricCardProps {
  metricKey: MetricKey;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  index: number;
  onSelect?: (key: MetricKey) => void;
}

const CARD_SURFACE =
  'relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-xs shadow-slate-900/5 transition-[transform,background-color,box-shadow] duration-200 ease-out';

const TONE_CLASSES: Record<Tone, { iconWrap: string; value: string }> = {
  positive: {
    iconWrap: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20',
    value: 'text-emerald-700',
  },
  neutral: {
    iconWrap: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    value: 'text-slate-900',
  },
  risk: {
    iconWrap: 'bg-rose-50 text-rose-700 ring-1 ring-rose-300',
    value: 'text-rose-700',
  },
};

function MetricCard({ metricKey, label, value, hint, icon: Icon, tone, index, onSelect }: MetricCardProps) {
  const styles = TONE_CLASSES[tone];
  return (
    <button
      type="button"
      onClick={() => onSelect?.(metricKey)}
      aria-haspopup="dialog"
      style={{ animationDelay: `${index * 60}ms` }}
      className={`group cp-animate-in cp-focus-card tap-press-subtle ${CARD_SURFACE} w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 motion-safe:hover:-translate-y-0.5 active:scale-[0.98]`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-slate-700">{label}</p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ease-out group-hover:scale-110 group-hover:rotate-6 ${styles.iconWrap}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-3 text-2xl font-semibold tabular-nums tracking-tight md:text-3xl transition-transform duration-200 group-hover:translate-x-0.5 ${styles.value}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </button>
  );
}

interface MetricCardsProps {
  state: AppState;
  today: Date;
  onSelect?: (key: MetricKey) => void;
}

export function MetricCards({ state, today, onSelect }: MetricCardsProps) {
  const totals = getTotals(state, today);
  const runway = cashRunwayDays(state, today);
  const runwayCapped = runway >= RUNWAY_HORIZON_DAYS;
  const clientCount = totals.clientsWithOutstanding;

  return (
    <section aria-label="Key metrics" className="cp-focus-group grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        metricKey="balance"
        index={0}
        label="Current Bank Balance"
        value={formatINR(state.bankBalance)}
        hint={state.bankBalance < 0 ? 'Account is overdrawn' : 'Available right now'}
        icon={Wallet}
        tone={state.bankBalance < 0 ? 'risk' : 'positive'}
        onSelect={onSelect}
      />
      <MetricCard
        metricKey="outstanding"
        index={1}
        label="Total Outstanding Invoices"
        value={formatINR(totals.outstanding)}
        hint={`Across ${clientCount} ${clientCount === 1 ? 'client' : 'clients'}`}
        icon={Receipt}
        tone="neutral"
        onSelect={onSelect}
      />
      <MetricCard
        metricKey="overdue"
        index={2}
        label="Overdue Amount"
        value={formatINR(totals.overdue)}
        hint={totals.overdue > 0 ? 'Past due and unpaid' : 'Nothing past due'}
        icon={AlertTriangle}
        tone={totals.overdue > 0 ? 'risk' : 'positive'}
        onSelect={onSelect}
      />
      <MetricCard
        metricKey="runway"
        index={3}
        label="Projected Cash Runway"
        value={runwayCapped ? '90+ Days' : `${runway} ${runway === 1 ? 'Day' : 'Days'} Remaining`}
        hint={
          runwayCapped
            ? `No cash breach in the next ${RUNWAY_HORIZON_DAYS} days`
            : 'Until the balance drops below zero'
        }
        icon={Timer}
        tone={runwayCapped || runway >= 30 ? 'positive' : 'risk'}
        onSelect={onSelect}
      />
    </section>
  );
}
