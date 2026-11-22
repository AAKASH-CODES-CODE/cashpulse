'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { Mic } from 'lucide-react';
import type { Client } from '../../lib/types';
import type { CreateInvoiceInput } from '../invoices/create-invoice-modal';

export interface VoiceInvoiceProps {
  clients: Client[];
  canCreate: boolean;
  onCreate: (input: CreateInvoiceInput) => void;
}

interface DraftFields {
  client: string;
  project: string;
  amount: string;
  issueDate: string;
  dueDate: string;
}

const SAMPLE_TRANSCRIPT = 'Bhai Tanvi ko ₹28,000 ka invoice bhej de packaging design ka, due 15 din mein';
const DEFAULT_DUE_DAYS = 15;
const DEFAULT_PROJECT = 'Consulting';
const WAVE_BARS = 12;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const AMOUNT_PATTERN = /(?:₹|rs\.?)\s*(\d[\d,]*(?:\.\d+)?)/i;
const DUE_DAYS_PATTERN = /(\d+)\s*din\b/i;
const NAME_PATTERN = /\b(?:Bhai|bhai|ko)\s+([A-Z][A-Za-z]+)/;
const DESIGN_PATTERN = /\b([A-Za-z]+\s+design)\b/i;
const KA_PATTERN = /\bka\s+([^,.]+)/i;

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition motion-safe:duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:opacity-40';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-700';
const secondaryButtonClass =
  'tap-press cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const primaryButtonClass =
  'tap-bounce cursor-pointer rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none';

/** Local calendar date as YYYY-MM-DD (no UTC conversion, so no off-by-one near midnight). */
function localIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addLocalDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

function findClientByName(clients: Client[], name: string): Client | undefined {
  const needle = name.trim().toLowerCase();
  if (needle === '') return undefined;
  return clients.find((c) => c.name.trim().toLowerCase() === needle);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Finds a client whose full name appears as whole words in the text; the longest matching name wins. */
function findClientInText(clients: Client[], text: string): Client | undefined {
  let best: Client | undefined;
  for (const c of clients) {
    const name = c.name.trim();
    if (name === '') continue;
    const pattern = new RegExp(`(?:^|[^A-Za-z0-9])${escapeRegExp(name)}(?![A-Za-z0-9])`, 'i');
    if (pattern.test(text) && (best === undefined || name.length > best.name.trim().length)) {
      best = c;
    }
  }
  return best;
}

/** Simple rule-based extraction from a spoken or typed sentence. */
function extractDraft(text: string, clients: Client[], today: Date): DraftFields {
  const amountMatch = AMOUNT_PATTERN.exec(text);
  const amountValue = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : NaN;
  const amount = Number.isFinite(amountValue) && amountValue > 0 ? String(amountValue) : '';

  const dueMatch = DUE_DAYS_PATTERN.exec(text);
  const dueDays = dueMatch ? Number(dueMatch[1]) : DEFAULT_DUE_DAYS;

  const capitalised = NAME_PATTERN.exec(text)?.[1] ?? '';
  const namedClient = findClientByName(clients, capitalised) ?? findClientInText(clients, text);
  const client = namedClient?.name ?? capitalised;

  const designMatch = DESIGN_PATTERN.exec(text);
  const kaMatch = KA_PATTERN.exec(text);
  const projectFromKa = kaMatch ? kaMatch[1].trim() : '';
  const project = designMatch ? designMatch[1] : projectFromKa || DEFAULT_PROJECT;

  const issueDate = localIsoDate(today);
  const dueDate = localIsoDate(addLocalDays(today, dueDays));

  return { client, project, amount, issueDate, dueDate };
}

function validateDraft(draft: DraftFields): string | null {
  if (draft.client.trim() === '') return 'Client name is required.';
  if (draft.project.trim() === '') return 'Project is required.';
  const amount = Number(draft.amount);
  if (draft.amount.trim() === '' || !Number.isFinite(amount) || amount <= 0) {
    return 'Amount must be greater than ₹0.';
  }
  if (!ISO_DATE.test(draft.issueDate)) return 'Issue date is required.';
  if (!ISO_DATE.test(draft.dueDate)) return 'Due date is required.';
  if (draft.dueDate < draft.issueDate) return 'Due date must be on or after the issue date.';
  return null;
}

export function VoiceInvoice({ clients, canCreate, onCreate }: VoiceInvoiceProps) {
  const uid = useId();
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [draft, setDraft] = useState<DraftFields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const ids = {
    client: `${uid}-client`,
    project: `${uid}-project`,
    amount: `${uid}-amount`,
    issueDate: `${uid}-issue-date`,
    dueDate: `${uid}-due-date`,
    transcript: `${uid}-transcript`,
  };

  const toggleRecording = () => {
    setRecording((prev) => !prev);
  };

  const handleExtract = () => {
    setDraft(extractDraft(transcript, clients, new Date()));
    setError(null);
  };

  const updateDraft = (key: keyof DraftFields, value: string) => {
    setDraft((prev) => (prev === null ? prev : { ...prev, [key]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canCreate || draft === null || submittingRef.current) return;
    const problem = validateDraft(draft);
    if (problem !== null) {
      setError(problem);
      return;
    }
    const match = findClientByName(clients, draft.client);
    if (match === undefined) {
      setError('Choose a client from your client list before creating.');
      return;
    }
    setError(null);
    submittingRef.current = true;
    try {
      onCreate({
        clientId: match.id,
        clientName: match.name.trim(),
        whatsapp: match.whatsapp,
        project: draft.project.trim(),
        amount: Number(draft.amount),
        issueDate: draft.issueDate,
        dueDate: draft.dueDate,
      });
      // Clear the draft so the form cannot be submitted again for the same invoice.
      setDraft(null);
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <section
      aria-labelledby={`${uid}-title`}
      className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xs md:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 id={`${uid}-title`} className="text-lg font-semibold text-slate-900">
            Voice to invoice
          </h2>
          <p className="mt-1 text-xs text-slate-500">Speak or type the job, review the fields, then create.</p>
        </div>
        <button
          type="button"
          onClick={toggleRecording}
          aria-pressed={recording}
          className={secondaryButtonClass}
        >
          <Mic className={`h-4 w-4 ${recording ? 'text-rose-600' : 'text-emerald-600'}`} aria-hidden="true" />
          {recording ? 'Stop' : 'Record'}
        </button>
      </div>

      <div className="mb-4 flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div aria-hidden="true" className="flex h-12 items-end justify-center gap-1">
          {Array.from({ length: WAVE_BARS }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-1.5 rounded-full bg-emerald-500/70 ${recording ? 'cp-wave-active' : ''}`}
              style={{ animationDelay: `${(i * 70) % 560}ms` }}
            />
          ))}
        </div>
        <p className="text-xs font-medium text-slate-600">
          {recording ? 'Simulated recording' : 'Not recording'}
        </p>
        <p className="text-[11px] text-slate-500">Simulated: no microphone is used.</p>
      </div>

      <div>
        <label htmlFor={ids.transcript} className={labelClass}>
          Transcript
        </label>
        <textarea
          id={ids.transcript}
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className={`${inputClass} resize-y`}
        />
        <button type="button" onClick={handleExtract} className={`${primaryButtonClass} mt-3`}>
          Extract details
        </button>
      </div>

      {draft === null ? (
        <p className="mt-5 text-xs text-slate-500">Extract details to review the invoice before creating it.</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4 border-t border-slate-200 pt-5">
          {!canCreate && (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Upgrade to Pro to create invoices from voice. The free plan allows 3 invoices per month.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={ids.client} className={labelClass}>
                Client
              </label>
              <input
                id={ids.client}
                type="text"
                autoComplete="off"
                value={draft.client}
                onChange={(e) => updateDraft('client', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={ids.project} className={labelClass}>
                Project
              </label>
              <input
                id={ids.project}
                type="text"
                value={draft.project}
                onChange={(e) => updateDraft('project', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={ids.amount} className={labelClass}>
                Amount (₹)
              </label>
              <input
                id={ids.amount}
                type="number"
                inputMode="decimal"
                min={1}
                step={1}
                value={draft.amount}
                onChange={(e) => updateDraft('amount', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={ids.issueDate} className={labelClass}>
                Issue date
              </label>
              <input
                id={ids.issueDate}
                type="date"
                value={draft.issueDate}
                onChange={(e) => updateDraft('issueDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor={ids.dueDate} className={labelClass}>
                Due date
              </label>
              <input
                id={ids.dueDate}
                type="date"
                value={draft.dueDate}
                onChange={(e) => updateDraft('dueDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {error !== null && (
            <p role="alert" className="text-xs text-rose-600">
              {error}
            </p>
          )}

          <button type="submit" disabled={!canCreate} className={primaryButtonClass}>
            Create invoice
          </button>
        </form>
      )}
    </section>
  );
}
