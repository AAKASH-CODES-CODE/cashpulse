'use client';

import { Clock, Zap, DollarSign, Award } from 'lucide-react';

export function NotebookRoiCard() {
  return (
    <div id="notebook-roi-card" className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-5 md:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            <Award className="h-3.5 w-3.5" />
            <span>Commercial Impact Benchmark</span>
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-950 dark:text-white">
            Notebook & Excel vs. CashPulse System
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Empirical ROI calculation for a 1-person Indian services business
          </p>
        </div>

        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-center sm:text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            Net Estimated ROI
          </div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">68x Return</div>
        </div>
      </div>

      {/* Grid of comparisons */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1 */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/60 p-3.5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Time Chasing Payments</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Notebook/Diary</span>
              <span className="text-sm font-bold text-rose-600">8.5 hrs / wk</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">CashPulse</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">45 sec / wk</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
            Saves 34 hours of awkward client calls every month.
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/60 p-3.5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span>Payment Settlement Speed</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Notebook/Diary</span>
              <span className="text-sm font-bold text-rose-600">44 Days</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">CashPulse</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">17 Days</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
            <span className="font-semibold text-emerald-600">27 days faster</span> via instant UPI QR & milestone lock.
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/60 p-3.5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <DollarSign className="h-4 w-4 text-blue-500" />
            <span>Bad Debt / Default Rate</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Notebook/Diary</span>
              <span className="text-sm font-bold text-rose-600">14.2%</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">CashPulse</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">1.1%</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
            Deliverable vault ensures client cannot take work without settlement.
          </div>
        </div>
      </div>
    </div>
  );
}
