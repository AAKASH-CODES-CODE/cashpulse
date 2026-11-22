'use client';

import type { MouseEvent } from 'react';
import { Download, EllipsisVertical, Plus, RotateCcw, Wallet } from 'lucide-react';
import type { Plan } from '../../lib/types';

export interface TopNavProps {
  onNewInvoice: () => void;
  onReset: () => void;
  plan: Plan;
  onOpenPricing: () => void;
  onExportCa?: () => void;
}

export function TopNav({ onNewInvoice, onReset, plan, onOpenPricing, onExportCa }: TopNavProps) {
  const planLabel = plan === 'pro' ? 'Pro' : 'Free plan';

  /** Runs a menu action, then closes the enclosing "More actions" menu. */
  const runMenuAction = (event: MouseEvent<HTMLButtonElement>, action: () => void): void => {
    event.currentTarget.closest('details')?.removeAttribute('open');
    action();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 shadow-lg shadow-emerald-500/20 transition-transform duration-200 ease-out hover:rotate-6 hover:scale-105">
            <Wallet className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 items-baseline gap-3">
            <span className="text-[15px] font-semibold tracking-tight text-zinc-50">CashPulse</span>
            <span className="hidden truncate text-xs text-zinc-500 md:block">
              The One-Person Back Office
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenPricing}
            className={`tap-press focus-ring-accent rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
              plan === 'pro'
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 hover:scale-105'
                : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-50 hover:bg-white/5'
            }`}
          >
            {planLabel}
          </button>

          <details className="relative">
            <summary
              aria-label="More actions"
              title="More actions"
              className="tap-press cp-focus flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-50 [&::-webkit-details-marker]:hidden"
            >
              <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 flex w-56 flex-col gap-1 rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur">
              {onExportCa ? (
                <button
                  type="button"
                  onClick={(event) => runMenuAction(event, onExportCa)}
                  className="tap-press cp-focus flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-zinc-50 cursor-pointer"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Export CA ledger (CSV)</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={(event) => runMenuAction(event, onReset)}
                className="tap-press cp-focus flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-zinc-50 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </details>

          <button
            type="button"
            onClick={onNewInvoice}
            className="tap-bounce focus-ring-accent group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-500 px-3.5 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-300 hover:to-emerald-400 hover:shadow-emerald-500/30 cursor-pointer"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 ease-out group-hover:rotate-90" aria-hidden="true" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>
    </header>
  );
}
