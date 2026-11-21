'use client';

import { Suspense, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Lock, Unlock, Zap } from 'lucide-react';
import { UpiQr } from '../../../components/payments/upi-qr';
import { grossFor, upiUri } from '../../../lib/intelligence';
import { getInvoiceStatus } from '../../../lib/forecast';
import { formatDate, formatINR } from '../../../lib/money';
import { useCashPulseStore } from '../../../lib/use-store';
import type { InvoiceStatus } from '../../../lib/types';

const CONFETTI_COUNT = 40;
const CONFETTI_COLORS = ['#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#e4e4e7'] as const;
const PAYEE_VPA = 'cashpulse@upi';
const PAYEE_NAME = 'CashPulse Freelancer';

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  overdue: 'Overdue',
};

function subscribeNoop(): () => void {
  return () => undefined;
}

/** True only after hydration on the client; the server render always sees false. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/** Random 12-digit reference, labelled as demo data in the UI. */
function generateDemoUtr(): string {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10).toString()).join('');
}

function PayInvoice() {
  const params = useParams();
  const rawId = params?.id;
  const id = typeof rawId === 'string' ? rawId : (rawId?.[0] ?? '');

  const { state, markInvoicePaid } = useCashPulseStore();
  const isClient = useIsClient();
  const [burst, setBurst] = useState(0);

  const invoice = state.invoices.find((inv) => inv.id === id);

  if (invoice === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-md rounded-2xl border border-white/5 bg-zinc-900/60 p-6 text-center shadow-2xl shadow-black/40">
          <h1 className="text-lg font-semibold text-zinc-50">Invoice not found</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This payment link does not match any invoice saved in this browser.
          </p>
          <Link
            href="/"
            className="tap-press cursor-pointer mt-5 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 hover:border-white/20 active:scale-95"
          >
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  const client = state.clients.find((c) => c.id === invoice.clientId);
  const isPaid = invoice.paidDate !== undefined;
  const deliverables = invoice.deliverables ?? [];
  const isLocked = !isPaid && invoice.milestoneLocked === true;

  // Status depends on today's date, so it is only computed after hydration to avoid a server/client mismatch.
  let statusLabel = '…';
  if (isPaid) statusLabel = STATUS_LABEL.paid;
  else if (isClient) statusLabel = STATUS_LABEL[getInvoiceStatus(invoice, new Date())];

  const payload = upiUri({
    payeeVpa: PAYEE_VPA,
    payeeName: PAYEE_NAME,
    amount: grossFor(invoice),
    note: `Invoice ${invoice.number}`,
  });

  function handleSimulatePayment() {
    if (invoice === undefined || invoice.paidDate !== undefined) return;
    markInvoicePaid(invoice.id, new Date(), generateDemoUtr());
    setBurst((n) => n + 1);
  }

  const deliverablesList =
    deliverables.length > 0 ? (
      <ul className="mt-3 space-y-2">
        {deliverables.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-zinc-500">Deliverables will appear after payment</p>
    );

  return (
    <main className="flex min-h-screen items-start justify-center p-4 py-10 md:p-8">
      <div className="w-full max-w-md space-y-4">
        <section className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 shadow-2xl shadow-black/40">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Invoice payment</p>
          <h1 className="mt-1 text-lg font-semibold text-zinc-50">{invoice.number}</h1>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-zinc-500">Client</dt>
            <dd className="truncate text-right text-zinc-200">{client?.name ?? 'Unknown client'}</dd>
            <dt className="text-zinc-500">Project</dt>
            <dd className="truncate text-right text-zinc-200">{invoice.project}</dd>
            <dt className="text-zinc-500">Amount</dt>
            <dd className="text-right font-semibold text-zinc-50">{formatINR(grossFor(invoice))}</dd>
            <dt className="text-zinc-500">Due date</dt>
            <dd className="text-right text-zinc-200">{formatDate(invoice.dueDate)}</dd>
            <dt className="text-zinc-500">Status</dt>
            <dd className="text-right">
              <span
                className={`font-medium ${isPaid ? 'text-emerald-400' : statusLabel === 'Overdue' ? 'text-rose-400' : 'text-zinc-200'}`}
              >
                {statusLabel}
              </span>
            </dd>
          </dl>
        </section>

        {isLocked ? (
          <section className="rounded-2xl border border-amber-500/30 bg-zinc-900/60 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 text-amber-300">
              <Lock className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Asset Delivery Locked until milestone clearance</h2>
            </div>
            {deliverablesList}
          </section>
        ) : (
          <section className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 text-emerald-300">
              <Unlock className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Unlocked</h2>
            </div>
            {deliverablesList}
          </section>
        )}

        {isPaid ? (
          <section className="rounded-2xl border border-emerald-500/30 bg-zinc-900/60 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Paid</h2>
            </div>
            <p className="mt-3 text-sm text-zinc-300">
              UTR (demo reference):{' '}
              <span className="font-mono text-zinc-100">{invoice.utr ?? 'Not recorded'}</span>
            </p>
          </section>
        ) : (
          <section className="space-y-4 rounded-2xl border border-white/5 bg-zinc-900/60 p-6 shadow-2xl shadow-black/40">
            <div className="flex justify-center">
              <UpiQr payload={payload} size={192} />
            </div>
            <p className="text-center text-xs text-zinc-500">Scan with any UPI app to pay {formatINR(grossFor(invoice))}</p>
            <button
              type="button"
              onClick={handleSimulatePayment}
              className="tap-bounce group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-900/30 hover:brightness-110 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              <Zap className="h-4 w-4 transition-transform duration-200 group-hover:scale-125" aria-hidden="true" />
              <span>Simulate Instant UPI Payment</span>
            </button>
          </section>
        )}

        <p className="px-2 text-center text-xs text-zinc-500">
          Demo note: this page reads invoices saved in this browser only (localStorage), so payment status
          appears only on the same browser and device that holds the invoice.
        </p>
      </div>

      {burst > 0 ? (
        <div
          key={burst}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden motion-reduce:hidden"
        >
          {Array.from({ length: CONFETTI_COUNT }, (_, i) => {
            const style = {
              left: `${(i * 53) % 100}%`,
              animationDelay: `${(i % 8) * 60}ms`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              '--cp-drift': `${((i % 7) - 3) * 12}px`,
            } as CSSProperties;
            return (
              <span
                key={i}
                className="cp-confetti absolute top-0 block h-2 w-1.5 rounded-sm"
                style={style}
              />
            );
          })}
        </div>
      ) : null}
    </main>
  );
}

export default function PayInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading invoice…</div>}>
      <PayInvoice />
    </Suspense>
  );
}
