'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Send, Sparkles, TrendingUp, X } from 'lucide-react';
import type { AppState } from '@/lib/types';
import { formatINR } from '@/lib/money';
import { buildReminderMessage, buildWhatsAppUrl } from '@/lib/whatsapp';

interface BadDayTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
}

export function BadDayTriageModal({ isOpen, onClose, state }: BadDayTriageModalProps) {
  const [blastedInvoices, setBlastedInvoices] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const today = new Date().toISOString().slice(0, 10);
  const nowMs = new Date(today).getTime();
  const overdueInvoices = state.invoices.filter((inv) => !inv.paidDate && inv.dueDate < today);
  const totalLocked = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Client lookup map
  const clientMap = new Map(state.clients.map((c) => [c.id, c]));

  const markBlasted = (id: string) => {
    setBlastedInvoices((prev) => new Set([...prev, id]));
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in"
    >
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header with emergency banner */}
        <div className="border-b border-rose-200 dark:border-rose-950/60 bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-rose-950/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-600/30">
                <ShieldAlert className="h-6 w-6 animate-pulse" />
              </span>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Emergency Cashflow Protocol</span>
                </div>
                <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  Bad Day Protocol: Multi-Client Late Triage
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  When multiple clients miss their payment deadlines, rescue your runway with 1-click batch chase and expense triage.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 cursor-pointer transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-white/80 dark:bg-slate-900/80 p-3">
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Locked Invoices</div>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400">{overdueInvoices.length} Clients</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Trapped Receivables</div>
              <div className="text-base font-bold text-slate-950 dark:text-white">{formatINR(totalLocked)}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Runway Rescued</div>
              <div className="inline-flex items-center gap-1 text-base font-bold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span>+28 Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body: Triage List */}
        <div className="max-h-[50vh] overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Ranked Priority Queue (Highest Exposure First)</span>
            <span className="text-[11px] text-slate-500">Pick WhatsApp Follow-Up</span>
          </div>

          {overdueInvoices.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <div className="mt-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">
                All Overdue Invoices Are Cleared!
              </div>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                Your cashflow health is in optimal shape. No urgent client follow-ups needed right now.
              </p>
            </div>
          ) : (
            overdueInvoices
              .sort((a, b) => b.amount - a.amount)
              .map((inv) => {
                const client = clientMap.get(inv.clientId);
                const isSent = blastedInvoices.has(inv.id);
                const delayDays = Math.max(
                  1,
                  Math.floor((nowMs - new Date(inv.dueDate).getTime()) / 86400000)
                );
                const reminderMsg = client
                  ? buildReminderMessage({
                      tone: 'urgent',
                      clientName: client.name,
                      invoiceNumber: inv.number,
                      amount: inv.amount,
                      dueDate: inv.dueDate,
                      upiId: 'cashpulse@upi',
                      paymentLink:
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/pay/${inv.id}`
                          : `https://cashpulse-eight.vercel.app/pay/${inv.id}`,
                      senderName: 'CashPulse Freelancer',
                    })
                  : '';
                const waUrl = client?.whatsapp ? buildWhatsAppUrl(client.whatsapp, reminderMsg) : '#';

                return (
                  <div
                    key={inv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 transition hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-950 dark:text-white">
                          {client?.name || 'Client'}
                        </span>
                        <span className="rounded-full bg-rose-100 dark:bg-rose-950/70 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                          {delayDays}d overdue
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 truncate">
                        {inv.project} &bull; <span className="font-semibold">{inv.number}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-slate-950 dark:text-white">
                          {formatINR(inv.amount)}
                        </div>
                        <div className="text-[10px] text-slate-500">Milestones Locked 🔒</div>
                      </div>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => markBlasted(inv.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                          isSent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        }`}
                      >
                        {isSent ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Chased</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>WhatsApp Follow-up</span>
                          </>
                        )}
                      </a>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Footer with Strategic Actions */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <span>AI Rule: Deliverable files stay encrypted until UPI payment clears.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="tap-press w-full sm:w-auto rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2 text-xs font-bold hover:bg-slate-800 cursor-pointer transition shadow-sm"
          >
            Done Triage
          </button>
        </div>
      </div>
    </div>
  );
}
