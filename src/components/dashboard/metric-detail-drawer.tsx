'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { RUNWAY_HORIZON_DAYS, cashRunwayDays, getTotals } from '../../lib/forecast';
import { safeToSpend } from '../../lib/intelligence';
import { daysOverdue, formatDate, formatINR } from '../../lib/money';
import type { AppState } from '../../lib/types';

export type MetricKey = 'balance' | 'outstanding' | 'overdue' | 'runway';

const TITLES: Record<MetricKey, string> = {
  balance: 'Current Bank Balance',
  outstanding: 'Total Outstanding Invoices',
  overdue: 'Overdue Amount',
  runway: 'Projected Cash Runway',
};

interface MetricDetailDrawerProps {
  metric: MetricKey | null;
  state: AppState;
  today: Date;
  onClose: () => void;
}

interface DetailItemProps {
  label: string;
  sub?: string;
  value: string;
  emphasis?: boolean;
}

function DetailItem({ label, sub, value, emphasis = false }: DetailItemProps) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className={`text-sm ${emphasis ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>{label}</p>
        {sub === undefined ? null : <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      </div>
      <p className={`shrink-0 text-sm tabular-nums text-slate-900 ${emphasis ? 'font-semibold' : ''}`}>{value}</p>
    </li>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="py-3 text-sm text-slate-500">{children}</p>;
}

function renderBody(metric: MetricKey, state: AppState, today: Date): ReactNode {
  const clientName = (clientId: string): string =>
    state.clients.find((c) => c.id === clientId)?.name ?? 'Unknown client';

  switch (metric) {
    case 'balance': {
      const s = safeToSpend(state, today);
      return (
        <ul className="divide-y divide-slate-100">
          <DetailItem label="Bank balance" value={formatINR(s.bankBalance)} />
          <DetailItem label="Less: rent due in 30 days" value={formatINR(s.lockedRent)} />
          <DetailItem
            label="Less: tax due in 30 days"
            sub="Includes GST on all unpaid invoices"
            value={formatINR(s.lockedTax)}
          />
          <DetailItem label="Less: contractors due in 30 days" value={formatINR(s.lockedContractor)} />
          <DetailItem label="Safe to spend" value={formatINR(s.safe)} emphasis />
        </ul>
      );
    }
    case 'outstanding': {
      const unpaid = state.invoices
        .filter((inv) => inv.paidDate === undefined)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const total = getTotals(state, today).outstanding;
      if (unpaid.length === 0) return <EmptyNote>No unpaid invoices.</EmptyNote>;
      return (
        <>
          <ul className="divide-y divide-slate-100">
            {unpaid.map((inv) => (
              <DetailItem
                key={inv.id}
                label={`${inv.number} · ${clientName(inv.clientId)}`}
                sub={`Due ${formatDate(inv.dueDate)}`}
                value={formatINR(inv.amount)}
              />
            ))}
          </ul>
          <p className="mt-3 border-t border-slate-200 pt-3 text-right text-sm font-semibold text-slate-900">
            Total {formatINR(total)}
          </p>
        </>
      );
    }
    case 'overdue': {
      const overdueInvoices = state.invoices
        .filter((inv) => inv.paidDate === undefined && daysOverdue(inv.dueDate, today) > 0)
        .sort((a, b) => daysOverdue(b.dueDate, today) - daysOverdue(a.dueDate, today));
      const total = getTotals(state, today).overdue;
      if (overdueInvoices.length === 0) return <EmptyNote>Nothing past due.</EmptyNote>;
      return (
        <>
          <ul className="divide-y divide-slate-100">
            {overdueInvoices.map((inv) => {
              const days = daysOverdue(inv.dueDate, today);
              return (
                <DetailItem
                  key={inv.id}
                  label={`${inv.number} · ${clientName(inv.clientId)}`}
                  sub={`${days} ${days === 1 ? 'day' : 'days'} overdue · due ${formatDate(inv.dueDate)}`}
                  value={formatINR(inv.amount)}
                />
              );
            })}
          </ul>
          <p className="mt-3 border-t border-slate-200 pt-3 text-right text-sm font-semibold text-slate-900">
            Total {formatINR(total)}
          </p>
        </>
      );
    }
    case 'runway': {
      const runway = cashRunwayDays(state, today);
      const capped = runway >= RUNWAY_HORIZON_DAYS;
      return (
        <>
          <p className="text-sm text-slate-700">
            {capped
              ? `No cash breach in the next ${RUNWAY_HORIZON_DAYS} days.`
              : `Balance drops below zero in ${runway} ${runway === 1 ? 'day' : 'days'}.`}
          </p>
          <p className="mb-1 mt-4 text-[11px] font-medium uppercase tracking-wide text-slate-500">Recurring bills</p>
          {state.expenses.length === 0 ? (
            <EmptyNote>No recurring bills.</EmptyNote>
          ) : (
            <ul className="divide-y divide-slate-100">
              {state.expenses.map((e) => (
                <DetailItem key={e.id} label={e.name} sub={`Due day ${e.dueDay}`} value={formatINR(e.amount)} />
              ))}
            </ul>
          )}
        </>
      );
    }
  }
}

export function MetricDetailDrawer({ metric, state, today, onClose }: MetricDetailDrawerProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (metric !== null && event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [metric, onClose]);

  const isOpen = metric !== null;
  const dialogRef = useRef<HTMLDivElement>(null);

  // Moves focus into the dialog, keeps Tab inside it, and returns focus to the opener on close.
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.focus();

    const handleTab = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || dialog === null) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => {
      window.removeEventListener('keydown', handleTab);
      opener?.focus();
    };
  }, [isOpen]);

  if (metric === null) return null;

  const titleId = 'metric-detail-title';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="spring-dialog relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 md:max-w-lg md:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {TITLES[metric]}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="tap-press cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{renderBody(metric, state, today)}</div>
      </div>
    </div>
  );
}
