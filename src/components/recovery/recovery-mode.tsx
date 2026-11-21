'use client';

import { useState } from 'react';
import { batchRecoveryTotals, overdueBatch } from '../../lib/intelligence';
import { daysOverdue, formatINR } from '../../lib/money';
import type { AppState, Invoice } from '../../lib/types';

export interface RecoveryModeProps {
  state: AppState;
  today: Date;
  onChase: (invoiceId: string) => void;
  onMarkPaid?: (id: string) => void;
}

const INSTANT_DISCOUNT_PERCENT = 2.5;

export function RecoveryMode({ state, today, onChase, onMarkPaid }: RecoveryModeProps) {
  const [discountOn, setDiscountOn] = useState(false);
  // null = not started; 0..n-1 = current account; n = batch complete.
  const [step, setStep] = useState<number | null>(null);

  const batch = overdueBatch(state, today);
  if (batch.invoices.length < 2) return null;

  const invoices: Invoice[] = batch.invoices;
  const n = invoices.length;
  // Clamp to the current batch size: the batch can shrink mid-run (e.g. an invoice is marked paid).
  const stepIndex = step === null ? null : Math.min(step, n);
  const index = stepIndex ?? 0;
  const clientName = (clientId: string): string =>
    state.clients.find((c) => c.id === clientId)?.name ?? 'Unknown client';
  const lateAccounts = new Set(invoices.map((inv) => inv.clientId)).size;
  const totals = batchRecoveryTotals(invoices, INSTANT_DISCOUNT_PERCENT);

  const isComplete = stepIndex !== null && stepIndex >= n;
  const current: Invoice | undefined = stepIndex !== null && stepIndex < n ? invoices[stepIndex] : undefined;
  const progressFraction = stepIndex === null ? 0 : Math.min(index + 1, n) / n;

  return (
    <section
      aria-label="Emergency cash recovery"
      className="cp-animate-in flex flex-col gap-5 rounded-2xl border border-rose-500/20 bg-zinc-900/60 p-5"
    >
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-rose-300">Recovery mode</p>
        <h3 className="text-base font-semibold text-zinc-100">Emergency Cash Recovery</h3>
        <p className="text-sm text-zinc-400">
          <span className="font-medium tabular-nums text-zinc-200">{lateAccounts}</span>{' '}
          {lateAccounts === 1 ? 'late account' : 'late accounts'} ·{' '}
          <span className="font-medium tabular-nums text-rose-300">{formatINR(totals.total)}</span> owed
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-zinc-950/40 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">Instant UPI discount 2.5%</p>
          {discountOn ? (
            <p className="mt-1 text-xs tabular-nums text-zinc-400">
              Pay now: <span className="text-emerald-300">{formatINR(totals.discounted)}</span> · Save{' '}
              {formatINR(totals.savings)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">Offer early UPI payment at a discount</p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={discountOn}
          onClick={() => setDiscountOn((on) => !on)}
          className={`tap-press cursor-pointer relative inline-flex h-6 w-11 shrink-0 items-center rounded-full active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
            discountOn ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-zinc-700'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-out ${
              discountOn ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-white/5">
        {invoices.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">{clientName(inv.clientId)}</p>
              <p className="text-xs text-zinc-500">
                {inv.number} · {daysOverdue(inv.dueDate, today)} days overdue
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">{formatINR(inv.amount)}</p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-zinc-950/40 p-4">
        {step === null ? (
          <button
            type="button"
            onClick={() => setStep(0)}
            className="tap-bounce flex items-center justify-center rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-900/30 hover:brightness-110 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            Start 90-second batch
          </button>
        ) : isComplete ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-sm font-semibold text-emerald-300">Batch complete</p>
            <p className="text-xs text-zinc-400">All {n} invoices have been worked.</p>
            <button
              type="button"
              onClick={() => setStep(null)}
              className="tap-press cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              Reset batch
            </button>
          </div>
        ) : current !== undefined ? (
          <>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="tabular-nums">Invoice {index + 1} of {n}</span>
              <span className="tabular-nums">{Math.round(progressFraction * 100)}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={n}
              aria-valuenow={index + 1}
              className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
            >
              <div
                className="cp-grow-x h-full rounded-full bg-emerald-400 transition-[width] duration-300"
                style={{ width: `${progressFraction * 100}%` }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-zinc-100">{clientName(current.clientId)}</p>
              <p className="text-xs tabular-nums text-zinc-400">
                {current.number} · {daysOverdue(current.dueDate, today)} days overdue ·{' '}
                {formatINR(current.amount)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChase(current.id)}
                className="tap-press cursor-pointer col-span-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                Chase
              </button>
              {onMarkPaid ? (
                <button
                  type="button"
                  onClick={() => onMarkPaid(current.id)}
                  className="tap-press cursor-pointer col-span-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 hover:text-emerald-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                >
                  Mark as Paid
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setStep(Math.max(0, index - 1))}
                disabled={index === 0}
                className="tap-press cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setStep(index + 1)}
                className="tap-press cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 hover:border-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                {index + 1 === n ? 'Finish' : 'Next'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
