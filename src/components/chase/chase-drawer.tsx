'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Copy, MessageCircle, X } from 'lucide-react';
import type { Client, Invoice } from '../../lib/types';
import { daysOverdue, formatDate, formatINR } from '../../lib/money';
import { grossFor, upiUri } from '../../lib/intelligence';
import {
  buildReminderMessage,
  buildWhatsAppUrl,
  toneForInvoice,
  type Tone,
} from '../../lib/whatsapp';
import { UpiQr } from '../payments/upi-qr';

// Fallback for browsers/contexts without the async Clipboard API.
function copyWithTextarea(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    textarea.remove();
  }
  return ok;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab cycling inside the dialog root. */
function trapTab(event: KeyboardEvent, root: HTMLElement | null): void {
  if (root === null) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const first = items[0];
  const last = items[items.length - 1];
  if (first === undefined || last === undefined) {
    event.preventDefault();
    root.focus();
    return;
  }
  const active = document.activeElement;
  const inside = active instanceof Node && root.contains(active);
  if (event.shiftKey) {
    if (!inside || active === first) {
      event.preventDefault();
      last.focus();
    }
  } else if (!inside || active === last) {
    event.preventDefault();
    first.focus();
  }
}

export interface ChaseDrawerProps {
  invoice: Invoice | null;
  client: Client | undefined;
  upiId: string;
  senderName: string;
  open: boolean;
  onClose: () => void;
  onMarkPaid?: (id: string) => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

const TONE_OPTIONS: { value: Tone; label: string; hint: string }[] = [
  { value: 'friendly', label: 'Friendly / Gentle', hint: 'Before due date' },
  { value: 'firm', label: 'Firm / Professional', hint: '1-7 days late' },
  { value: 'urgent', label: 'Urgent / Legal', hint: '15+ days late' },
];

export function ChaseDrawer({
  invoice,
  client,
  upiId,
  senderName,
  open,
  onClose,
  onMarkPaid,
}: ChaseDrawerProps) {
  // Manual tone choice, scoped to the invoice it was made for so switching invoices
  // falls back to that invoice's default tone.
  const [toneOverride, setToneOverride] = useState<{ invoiceId: string; tone: Tone } | null>(null);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const dialogRef = useRef<HTMLDivElement>(null);
  const visible = open && invoice !== null;

  useEffect(() => {
    if (!visible) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'Tab') trapTab(event, dialogRef.current);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  // Move focus into the dialog on open and return it to the opener on close.
  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, [visible]);

  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = window.setTimeout(() => setCopyState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  if (!open || invoice === null) return null;

  const current: Invoice = invoice;
  const daysLate = daysOverdue(current.dueDate, new Date());
  const defaultTone = toneForInvoice(daysLate);
  const tone: Tone = toneOverride?.invoiceId === current.id ? toneOverride.tone : defaultTone;
  const isOverdue = daysLate > 0;

  const paymentLink = upiUri({
    payeeVpa: upiId,
    payeeName: senderName,
    amount: grossFor(current),
    note: `Invoice ${current.number}`,
  });

  const message = buildReminderMessage({
    tone,
    clientName: client?.name ?? 'there',
    invoiceNumber: current.number,
    amount: current.amount,
    dueDate: current.dueDate,
    upiId,
    paymentLink,
    senderName,
  });

  async function handleCopy() {
    let copied = false;
    try {
      if (navigator.clipboard === undefined) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(message);
      copied = true;
    } catch {
      copied = copyWithTextarea(message);
    }
    setCopyState(copied ? 'copied' : 'failed');
  }

  function handleSend() {
    window.open(buildWhatsAppUrl(client?.whatsapp ?? '', message), '_blank', 'noopener,noreferrer');
  }

  function handleMarkPaid() {
    onMarkPaid?.(current.id);
    onClose();
  }

  const copyLabel =
    copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy Text';

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center focus:outline-none md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chase-drawer-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="spring-dialog relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white text-slate-900 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl md:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Chase payment</p>
            <h2 id="chase-drawer-title" className="mt-1 truncate text-lg font-semibold text-slate-900">
              {client?.name ?? 'Unknown client'} · {current.number}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {formatINR(current.amount)} due {formatDate(current.dueDate)}
              {isOverdue ? (
                <span className="ml-2 font-medium text-rose-700">{daysLate} days overdue</span>
              ) : (
                <span className="ml-2 font-medium text-emerald-700">Not yet due</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-press shrink-0 rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section>
            <p className="mb-2 text-xs font-medium text-slate-600">Tone</p>
            <div
              className="relative grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
              role="group"
              aria-label="Reminder tone"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-1 rounded-lg bg-white shadow-sm ring-1 ring-slate-200 motion-safe:transition-[left] motion-safe:duration-300 motion-safe:ease-out"
                style={{
                  left: `calc(0.25rem + ${TONE_OPTIONS.findIndex((o) => o.value === tone)} * ((100% - 0.5rem) / 3 + 0.25rem))`,
                  width: 'calc((100% - 0.5rem) / 3)',
                }}
              />
              {TONE_OPTIONS.map((option) => {
                const pressed = option.value === tone;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setToneOverride({ invoiceId: current.id, tone: option.value })}
                    className={`tap-press relative z-10 rounded-lg px-2.5 py-2 text-left cursor-pointer active:scale-95 ${
                      pressed ? 'text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className={`block text-xs ${pressed ? 'text-slate-600' : 'text-slate-500'}`}>
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-medium text-slate-600">Message preview</p>
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-[inherit] text-sm leading-relaxed text-slate-700">
              {message}
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-medium text-slate-600">Pay by UPI QR</p>
            <UpiQr payload={paymentLink} />
          </section>
        </div>

        <footer className="space-y-2 border-t border-slate-200 p-5">
          <button
            type="button"
            onClick={handleSend}
            className="tap-bounce group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:brightness-110 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-40 disabled:shadow-none"
          >
            <MessageCircle className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" aria-hidden="true" />
            Send via WhatsApp
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`tap-press cursor-pointer flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                copyState === 'failed'
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : copyState === 'copied'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {copyState === 'copied' ? (
                <Check className="h-4 w-4 animate-in zoom-in-50 duration-200" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
              )}
              {copyLabel}
            </button>

            {onMarkPaid ? (
              <button
                type="button"
                onClick={handleMarkPaid}
                className="tap-press cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-emerald-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <CheckCircle2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                Mark as Paid
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
