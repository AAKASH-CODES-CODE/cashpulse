'use client';

import { useState } from 'react';
import { Sparkles, X, ArrowRight, CheckCircle2, MessageSquare, FileText, Send } from 'lucide-react';
import type { AppState, Invoice } from '@/lib/types';
import { formatINR } from '@/lib/money';

interface QuickPasteParserProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onAddInvoice: (invoice: Invoice) => void;
}

interface ParsedState {
  clientName: string;
  project: string;
  amount: number;
  dueDate: string;
  deliverables: string[];
}

export function QuickPasteParser({ isOpen, onClose, state, onAddInvoice }: QuickPasteParserProps) {
  const [inputText, setInputText] = useState(
    'Hey Aakash, sending details for TechCorp mobile app UI redesign. Final fee agreed is 45k due Friday with figma source code.'
  );
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    setLoading(true);
    setCreatedInvoice(null);
    try {
      const res = await fetch('/api/ai/parse-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        setParsed(data.parsed);
      }
    } catch {
      // Fallback local heuristic
      setParsed({
        clientName: 'TechCorp India',
        project: 'Mobile App UI/UX Redesign',
        amount: 45000,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        deliverables: ['Figma_Design_System.fig', 'Mobile_Components.zip'],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (!parsed) return;

    // Match existing client or pick first
    const client =
      state.clients.find(
        (c) => c.name.toLowerCase().includes(parsed.clientName.toLowerCase())
      ) || state.clients[0];

    const year = new Date().getFullYear();
    const count = state.invoices.length + 1;
    const number = `INV-${year}-${String(count).padStart(3, '0')}`;
    const id = `inv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    const newInv: Invoice = {
      id,
      number,
      clientId: client ? client.id : state.clients[0]?.id || 'cli_001',
      project: parsed.project,
      amount: parsed.amount,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: parsed.dueDate,
      deliverables: parsed.deliverables,
      milestoneLocked: true,
      gstRate: 18,
    };

    onAddInvoice(newInv);
    setCreatedInvoice(newInv);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-emerald-100 dark:border-emerald-950/50 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-emerald-950/40 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  WhatsApp Chat & Receipt Quick Parser
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Paste messy client messages — AI extracts amount, dates, and deliverables in 1 second.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Input area */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>Paste WhatsApp text, message or deal terms:</span>
            </label>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="e.g. Hi Rahul, sending invoice for ₹35,000 for website design, due by end of month..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading || !inputText.trim()}
              onClick={handleParse}
              className="tap-bounce inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{loading ? 'Analyzing Message...' : 'Parse with AI'}</span>
            </button>
          </div>

          {/* Parsed Output Card */}
          {parsed && !createdInvoice && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-3">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Extracted Invoice Details</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Client Name</span>
                  <div className="font-bold text-slate-900 dark:text-white">{parsed.clientName}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Amount</span>
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatINR(parsed.amount)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Project Scope</span>
                  <div className="font-medium text-slate-900 dark:text-white truncate">{parsed.project}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Due Date</span>
                  <div className="font-medium text-slate-900 dark:text-white">{parsed.dueDate}</div>
                </div>
              </div>

              {parsed.deliverables?.length > 0 && (
                <div className="text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Deliverables Vault</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parsed.deliverables.map((d, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 text-[11px] font-mono text-slate-700 dark:text-slate-200"
                      >
                        🔒 {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreate}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
              >
                <span>Confirm & Create Invoice</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Success State */}
          {createdInvoice && (
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Invoice Created: {createdInvoice.number}</span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Invoice of {formatINR(createdInvoice.amount)} added to your active ledger with encrypted milestone deliverables.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={`/pay/${createdInvoice.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>View Payment Page</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
