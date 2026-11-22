'use client';

import { Suspense, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Lock, Unlock, Zap, Download, ShieldCheck, ArrowLeft } from 'lucide-react';
import { UpiQr } from '../../../components/payments/upi-qr';
import { grossFor, upiUri } from '../../../lib/intelligence';
import { getInvoiceStatus } from '../../../lib/forecast';
import { formatDate, formatINR } from '../../../lib/money';
import { useCashPulseStore } from '../../../lib/use-store';
import type { InvoiceStatus } from '../../../lib/types';

const CONFETTI_COUNT = 40;
const CONFETTI_COLORS = ['#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#94a3b8'] as const;
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
  return `UPI${Array.from({ length: 12 }, () => Math.floor(Math.random() * 10).toString()).join('')}`;
}

function PayInvoice() {
  const params = useParams();
  const rawId = params?.id;
  const id = typeof rawId === 'string' ? rawId : (rawId?.[0] ?? '');

  const { state, markInvoicePaid } = useCashPulseStore();
  const isClient = useIsClient();
  const [burst, setBurst] = useState(0);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const invoice = state.invoices.find((inv) => inv.id === id);

  if (invoice === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Invoice not found</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            This payment link does not match any invoice saved in this browser.
          </p>
          <Link
            href="/"
            className="tap-press cursor-pointer mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to dashboard</span>
          </Link>
        </section>
      </main>
    );
  }

  const client = state.clients.find((c) => c.id === invoice.clientId);
  const isPaid = invoice.paidDate !== undefined;
  const deliverables =
    invoice.deliverables && invoice.deliverables.length > 0
      ? invoice.deliverables
      : ['Final_Design_Assets.fig', 'Deliverables_Master_Bundle.zip'];
  const isLocked = !isPaid && invoice.milestoneLocked !== false;

  let statusLabel = '…';
  if (isPaid) statusLabel = STATUS_LABEL.paid;
  else if (isClient) statusLabel = STATUS_LABEL[getInvoiceStatus(invoice, new Date())];

  const payload = upiUri({
    payeeVpa: PAYEE_VPA,
    payeeName: PAYEE_NAME,
    amount: grossFor(invoice),
    note: `Invoice ${invoice.number}`,
  });

  async function handleSimulatePayment() {
    if (invoice === undefined || invoice.paidDate !== undefined) return;
    const demoUtr = generateDemoUtr();
    markInvoicePaid(invoice.id, new Date(), demoUtr);
    setBurst((n) => n + 1);

    // Also trigger backend webhook in background
    try {
      await fetch('/api/webhooks/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          utr: demoUtr,
          amount: grossFor(invoice),
          paymentMode: 'UPI',
        }),
      });
    } catch {
      // Background sync best-effort
    }
  }

  function handleDownloadAsset(filename: string) {
    const textContent = `CASHPULSE ENCRYPTED DELIVERABLE VAULT\n====================================\nInvoice: ${invoice?.number}\nDeliverable Asset: ${filename}\nStatus: PAYMENT VERIFIED & UNLOCKED\nRecorded Bank UTR: ${invoice?.utr || 'DEMO_VERIFIED'}\nTimestamp: ${new Date().toISOString()}\n\nThank you for prompt settlement!`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadNotice(`Downloaded: ${filename}`);
    setTimeout(() => setDownloadNotice(null), 3000);
  }

  return (
    <main className="flex min-h-screen items-start justify-center p-4 py-8 md:p-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-4">
        {/* Navigation link */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>CashPulse Dashboard</span>
          </Link>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>UPI Encrypted Escrow</span>
          </span>
        </div>

        {/* Invoice Summary Card */}
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verified Invoice
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                  : statusLabel === 'Overdue'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <h1 className="mt-1.5 text-xl font-extrabold text-slate-950 dark:text-white">{invoice.number}</h1>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <dt className="text-slate-500 dark:text-slate-400">Billed Client</dt>
            <dd className="truncate text-right font-semibold text-slate-900 dark:text-slate-100">
              {client?.name ?? 'Unknown Client'}
            </dd>
            <dt className="text-slate-500 dark:text-slate-400">Project / Scope</dt>
            <dd className="truncate text-right font-medium text-slate-900 dark:text-slate-100">{invoice.project}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Due Date</dt>
            <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{formatDate(invoice.dueDate)}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Total Payable</dt>
            <dd className="text-right text-base font-extrabold text-slate-950 dark:text-white">
              {formatINR(grossFor(invoice))}
            </dd>
          </dl>
        </section>

        {/* Milestone Deliverable Vault Section */}
        {isLocked ? (
          <section className="rounded-2xl border border-amber-300/80 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Lock className="h-4.5 w-4.5" aria-hidden="true" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Asset Vault Locked (Clear Payment to Unlock)
              </h2>
            </div>
            <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-400">
              The project files below are secured in escrow and will unlock automatically the moment UPI payment is received.
            </p>
            <ul className="mt-3 space-y-2">
              {deliverables.map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-between rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-white/80 dark:bg-slate-900/80 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate">{item}</span>
                  </div>
                  <span className="rounded bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 shrink-0">
                    Encrypted 🔒
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="rounded-2xl border border-emerald-300/80 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Unlock className="h-4.5 w-4.5" aria-hidden="true" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Deliverable Vault Unlocked
              </h2>
            </div>
            <p className="mt-1 text-xs text-emerald-700/90 dark:text-emerald-400">
              Payment confirmed! You may now download your verified project assets.
            </p>
            <ul className="mt-3 space-y-2">
              {deliverables.map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-between rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-white dark:bg-slate-900 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">{item}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadAsset(item)}
                    className="tap-press inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-emerald-500 cursor-pointer shrink-0"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </button>
                </li>
              ))}
            </ul>

            {downloadNotice && (
              <div className="mt-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-in">
                {downloadNotice}
              </div>
            )}
          </section>
        )}

        {/* Payment Confirmation or UPI QR Section */}
        {isPaid ? (
          <section className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-2 text-base font-bold text-slate-950 dark:text-white">Payment Received</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Settlement completed. Receipt & tax invoice dispatched.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Bank UTR Reference</span>
              <div className="font-mono font-bold text-slate-950 dark:text-white text-sm mt-0.5">
                {invoice.utr ?? 'UPI20261122889912'}
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex justify-center p-2 rounded-xl bg-white border border-slate-100 shadow-inner">
              <UpiQr payload={payload} size={192} />
            </div>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Scan with GPay, PhonePe, Paytm, or BHIM to pay {formatINR(grossFor(invoice))}
            </p>
            <button
              type="button"
              onClick={handleSimulatePayment}
              className="tap-bounce group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 active:scale-95 cursor-pointer"
            >
              <Zap className="h-4 w-4 transition-transform duration-200 group-hover:scale-125" aria-hidden="true" />
              <span>Simulate Instant UPI Payment</span>
            </button>
          </section>
        )}

        <p className="px-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
          CashPulse verified payment link. Zero transaction fees via direct NPCI UPI.
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
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading invoice…</div>}>
      <PayInvoice />
    </Suspense>
  );
}
