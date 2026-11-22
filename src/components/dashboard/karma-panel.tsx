'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { karmaFor, negotiationScript, type KarmaGrade } from '../../lib/intelligence';

import type { AppState, Client } from '../../lib/types';

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

export interface KarmaPanelProps {
  state: AppState;
  today: Date;
}

const GRADE_CLASSES: Record<KarmaGrade, string> = {
  'A+': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300',
  A: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  B: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  C: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  D: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  F: 'bg-rose-100 text-rose-700 ring-1 ring-rose-300',
};

export function KarmaPanel({ state, today }: KarmaPanelProps) {
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Stop the "Copied" reset timer if the panel unmounts before it fires.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const clients = state.clients.filter((client: Client) =>
    state.invoices.some((inv) => inv.clientId === client.id),
  );

  async function handleCopy(clientId: string, text: string) {
    let copied = false;
    try {
      if (navigator.clipboard === undefined) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = copyWithTextarea(text);
    }
    if (!copied) return;
    setCopiedClientId(clientId);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setCopiedClientId((current) => (current === clientId ? null : current));
    }, 2000);
  }

  if (clients.length === 0) {
    return (
      <section aria-label="Client karma" className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900">Client Karma</h3>
        <p className="mt-2 text-sm text-slate-600">Add clients and invoices to see payment reliability grades.</p>
      </section>
    );
  }

  return (
    <section aria-label="Client karma" className="cp-animate-in flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-semibold text-slate-900">Client Karma</h3>
      <ul className="flex flex-col gap-3">
        {clients.map((client, index) => {
          const karma = karmaFor(state, client.id, today);
          const unpaid = state.invoices.filter((inv) => inv.clientId === client.id && inv.paidDate === undefined);
          const largestUnpaid = unpaid.reduce((max, inv) => Math.max(max, inv.amount), 0);
          const depositPercent = karma.chronicDefaulter ? 80 : 50;
          const script = negotiationScript(client.name, depositPercent, largestUnpaid);
          const copied = copiedClientId === client.id;

          return (
            <li
              key={client.id}
              style={{ animationDelay: `${index * 60}ms` }}
              className="cp-animate-in flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${GRADE_CLASSES[karma.grade]}`}
                >
                  Grade {karma.grade}
                </span>
              </div>
              {karma.noHistory ? (
                <p className="text-xs text-slate-500">No payment history yet</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <p>
                    Avg days late:{' '}
                    <span className="font-medium tabular-nums text-slate-900">{karma.avgDaysLate.toFixed(1)}</span>
                  </p>
                  <p>
                    On-time rate:{' '}
                    <span className="font-medium tabular-nums text-slate-900">{karma.onTimeRate}%</span>
                  </p>
                </div>
              )}

              {karma.depositAdvice !== null ? (
                <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-800">{karma.depositAdvice}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Negotiation script</p>
                  {largestUnpaid > 0 ? (
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{script}</p>
                  ) : (
                    <p className="text-xs text-slate-600">No open invoice</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopy(client.id, script)}
                    className={`tap-press cursor-pointer flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                      copied
                        ? 'cp-animate-in border-emerald-200 bg-emerald-50 text-emerald-700 scale-105 shadow-sm shadow-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 animate-in zoom-in-50 duration-200" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                    )}
                    {copied ? 'Copied' : 'Copy script'}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
