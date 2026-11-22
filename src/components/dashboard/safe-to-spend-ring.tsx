import type { CSSProperties } from 'react';
import { safeToSpend } from '../../lib/intelligence';
import { formatINR } from '../../lib/money';
import type { AppState } from '../../lib/types';

export interface SafeToSpendRingProps {
  state: AppState;
  today: Date;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SafeToSpendRing({ state, today }: SafeToSpendRingProps) {
  const { bankBalance, lockedRent, lockedTax, lockedContractor, safe } = safeToSpend(state, today);

  const ratio = bankBalance > 0 ? safe / bankBalance : 0;
  const share = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  const hasArc = safe > 0 && share > 0;
  const isNegative = safe < 0;
  // Avoids "-₹0" for negative zero or amounts that round to zero.
  const safeAmount = Math.round(safe) === 0 ? 0 : safe;
  const ringColor = isNegative ? '#fb7185' : '#34d399';
  const textClass = isNegative ? 'text-rose-400' : 'text-emerald-400';
  const ringOffset = CIRCUMFERENCE * (1 - share);

  const rows: { label: string; value: number; emphasis?: boolean }[] = [
    { label: 'Bank balance', value: bankBalance },
    { label: 'Locked rent', value: -lockedRent },
    { label: 'Locked tax (incl. GST owed)', value: -lockedTax },
    { label: 'Locked contractor', value: -lockedContractor },
    { label: 'Safe to spend', value: safeAmount, emphasis: true },
  ];

  return (
    <section
      aria-label="Safe to spend"
      className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 md:flex-row md:items-center shadow-xs"
    >
      <div className="relative mx-auto h-40 w-40 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="12" />
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="12"
            strokeLinecap={hasArc ? 'round' : 'butt'}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
            className="cp-ring-draw"
            style={
              {
                '--cp-ring-circ': `${CIRCUMFERENCE}px`,
                '--cp-ring-offset': `${ringOffset}px`,
              } as CSSProperties
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Safe</p>
          <p className={`text-lg font-semibold tabular-nums ${textClass}`}>{formatINR(safeAmount)}</p>
        </div>
      </div>

      <dl className="w-full flex-1 divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className={`text-sm ${row.emphasis ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
              {row.label}
            </dt>
            <dd
              className={`text-sm tabular-nums ${
                row.emphasis ? `font-semibold ${textClass}` : 'text-slate-800'
              }`}
            >
              {row.value < 0 ? `− ${formatINR(-row.value)}` : formatINR(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
