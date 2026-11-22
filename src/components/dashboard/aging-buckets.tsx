import { getAgingSummary, type AgingBucket } from '../../lib/forecast';
import { formatINR } from '../../lib/money';
import type { AppState } from '../../lib/types';

type Accent = 'emerald' | 'amber' | 'rose';

interface BucketConfig {
  key: AgingBucket;
  label: string;
  range: string;
  accent: Accent;
}

const BUCKETS: BucketConfig[] = [
  { key: 'current', label: 'Current', range: '0–15 days', accent: 'emerald' },
  { key: 'aging', label: 'Aging', range: '16–30 days', accent: 'amber' },
  { key: 'critical', label: 'Critical', range: '31+ days', accent: 'rose' },
];

const ACCENT_CLASSES: Record<Accent, { text: string; bar: string; active: string }> = {
  emerald: {
    text: 'text-emerald-700',
    bar: 'bg-emerald-500',
    active: 'aria-pressed:ring-1 aria-pressed:ring-current/40 aria-pressed:bg-emerald-50',
  },
  amber: {
    text: 'text-amber-700',
    bar: 'bg-amber-500',
    active: 'aria-pressed:ring-1 aria-pressed:ring-current/40 aria-pressed:bg-amber-50',
  },
  rose: {
    text: 'text-rose-700',
    bar: 'bg-rose-500',
    active: 'aria-pressed:ring-1 aria-pressed:ring-current/40 aria-pressed:bg-rose-50',
  },
};

interface AgingBucketsProps {
  state: AppState;
  today: Date;
  activeBucket: AgingBucket | null;
  onBucketChange: (bucket: AgingBucket | null) => void;
}

export function AgingBuckets({ state, today, activeBucket, onBucketChange }: AgingBucketsProps) {
  const summary = getAgingSummary(state, today);

  return (
    <section aria-label="Aging buckets" className="cp-focus-group grid grid-cols-1 gap-3 sm:grid-cols-3">
      {BUCKETS.map(({ key, label, range, accent }, index) => {
        const { count, amount } = summary[key];
        const isActive = activeBucket === key;
        const styles = ACCENT_CLASSES[accent];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onBucketChange(isActive ? null : key)}
            style={{ animationDelay: `${index * 60}ms` }}
            className={`cp-animate-in cp-focus-card tap-press-subtle group relative flex flex-col items-start gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-white bg-gradient-to-br from-slate-50 to-transparent py-4 pl-5 pr-4 text-left shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_8px_24px_-12px_rgba(15,23,42,0.18)] hover:bg-slate-50 motion-safe:hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${styles.text} ${styles.active}`}
          >
            <span
              aria-hidden="true"
              className={`cp-grow-x absolute inset-y-3 left-0 w-1 rounded-r-full ${styles.bar}`}
            />
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs opacity-80">{range}</span>
            </span>
            <span className="text-xl font-semibold tabular-nums text-slate-900">
              {formatINR(amount)}
            </span>
            <span className="text-xs text-slate-500">
              {count} {count === 1 ? 'invoice' : 'invoices'}
            </span>
          </button>
        );
      })}
    </section>
  );
}
