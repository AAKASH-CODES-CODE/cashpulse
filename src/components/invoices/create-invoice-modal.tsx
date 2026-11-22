'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { addDays, parseIsoDate, toIsoDate } from '../../lib/money';
import type { Client } from '../../lib/types';

export interface CreateInvoiceInput {
  clientId: string;
  clientName: string;
  whatsapp: string;
  project: string;
  amount: number;
  issueDate: string;
  dueDate: string;
}

export interface CreateInvoiceModalProps {
  open: boolean;
  clients: Client[];
  onClose: () => void;
  onCreate: (input: CreateInvoiceInput) => void;
  canCreate: boolean;
  onUpgrade?: () => void;
}

interface FormValues {
  clientName: string;
  whatsapp: string;
  project: string;
  amount: string;
  issueDate: string;
  dueDate: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const inputClass =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition motion-safe:duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:opacity-40';

function inputBorder(error: string | undefined): string {
  return error ? 'border-rose-500/80' : 'border-slate-300';
}

const labelClass = 'mb-1.5 block text-xs font-medium text-slate-700';
const errorClass = 'mt-1.5 text-xs text-rose-600';
const secondaryButtonClass =
  'tap-press cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const primaryButtonClass =
  'tap-bounce cursor-pointer rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none';

function findClient(clients: Client[], name: string): Client | undefined {
  const needle = name.trim().toLowerCase();
  if (needle === '') return undefined;
  return clients.find((c) => c.name.trim().toLowerCase() === needle);
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.clientName.trim() === '') errors.clientName = 'Client name is required.';
  if (values.whatsapp.replace(/\D/g, '').length < 10) {
    errors.whatsapp = 'Enter a valid WhatsApp number (at least 10 digits).';
  }
  if (values.project.trim() === '') errors.project = 'Service description is required.';

  const amount = Number(values.amount);
  if (values.amount.trim() === '') errors.amount = 'Enter an amount.';
  else if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be greater than ₹0.';

  if (!ISO_DATE.test(values.issueDate)) errors.issueDate = 'Issue date is required.';

  if (!ISO_DATE.test(values.dueDate)) {
    errors.dueDate = 'Payment due date is required.';
  } else if (ISO_DATE.test(values.issueDate) && values.dueDate < values.issueDate) {
    errors.dueDate = 'Due date must be on or after the issue date.';
  }
  return errors;
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

export function CreateInvoiceModal(props: CreateInvoiceModalProps) {
  if (!props.open) return null;
  return (
    <InvoiceForm
      clients={props.clients}
      onClose={props.onClose}
      onCreate={props.onCreate}
      canCreate={props.canCreate}
      onUpgrade={props.onUpgrade}
    />
  );
}

type InvoiceFormProps = Omit<CreateInvoiceModalProps, 'open'>;

function InvoiceForm({ clients, onClose, onCreate, canCreate, onUpgrade }: InvoiceFormProps) {
  const uid = useId();
  const [values, setValues] = useState<FormValues>(() => {
    const issueDate = toIsoDate(new Date());
    return {
      clientName: '',
      whatsapp: '',
      project: '',
      amount: '',
      issueDate,
      dueDate: toIsoDate(addDays(parseIsoDate(issueDate), 15)),
    };
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Tab') trapTab(e, dialogRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Move focus into the dialog on open and return it to the opener on close.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const errors = validate(values);
  const isValid = Object.keys(errors).length === 0;
  const submitDisabled = !isValid || !canCreate;

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleNameChange = (name: string) => {
    const match = findClient(clients, name);
    setValues((prev) => ({
      ...prev,
      clientName: name,
      whatsapp: match ? match.whatsapp : prev.whatsapp,
    }));
    setTouched((prev) => ({ ...prev, clientName: true }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitDisabled) return;
    const match = findClient(clients, values.clientName);
    onCreate({
      clientId: match?.id ?? '',
      clientName: values.clientName.trim(),
      whatsapp: values.whatsapp.trim(),
      project: values.project.trim(),
      amount: Number(values.amount),
      issueDate: values.issueDate,
      dueDate: values.dueDate,
    });
    onClose();
  };

  const shownError = (key: keyof FormValues): string | undefined =>
    touched[key] ? errors[key] : undefined;

  const ids = {
    clientName: `${uid}-client-name`,
    whatsapp: `${uid}-whatsapp`,
    project: `${uid}-project`,
    amount: `${uid}-amount`,
    issueDate: `${uid}-issue-date`,
    dueDate: `${uid}-due-date`,
    title: `${uid}-title`,
    listId: `${uid}-clients`,
  };

  const nameError = shownError('clientName');
  const whatsappError = shownError('whatsapp');
  const projectError = shownError('project');
  const amountError = shownError('amount');
  const issueError = shownError('issueDate');
  const dueError = shownError('dueDate');

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        className="spring-dialog relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-900/15 backdrop-blur-xl md:rounded-2xl md:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={ids.title} className="text-lg font-semibold text-slate-900">
            New invoice
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-press cursor-pointer shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {!canCreate && (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>Free plan limit reached: 3 invoices per month.</p>
            <button
              type="button"
              onClick={onUpgrade}
              className="tap-bounce cursor-pointer shrink-0 rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-300/20 to-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-200 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 motion-safe:duration-200"
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={ids.clientName} className={labelClass}>
                Client Name
              </label>
              <input
                id={ids.clientName}
                type="text"
                list={ids.listId}
                autoComplete="off"
                value={values.clientName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Acme Studio"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `${ids.clientName}-error` : undefined}
                className={`${inputClass} ${inputBorder(nameError)}`}
              />
              <datalist id={ids.listId}>
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
              {nameError && (
                <p id={`${ids.clientName}-error`} className={errorClass}>
                  {nameError}
                </p>
              )}
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
                value={values.amount}
                onChange={(e) => setField('amount', e.target.value)}
                placeholder="0"
                aria-invalid={amountError ? true : undefined}
                aria-describedby={amountError ? `${ids.amount}-error` : undefined}
                className={`${inputClass} ${inputBorder(amountError)}`}
              />
              {amountError && (
                <p id={`${ids.amount}-error`} className={errorClass}>
                  {amountError}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor={ids.whatsapp} className={labelClass}>
              Phone / WhatsApp Number
            </label>
            <input
              id={ids.whatsapp}
              type="text"
              inputMode="tel"
              autoComplete="off"
              value={values.whatsapp}
              onChange={(e) => setField('whatsapp', e.target.value)}
              placeholder="+91 98xxxxxx10"
              aria-invalid={whatsappError ? true : undefined}
              aria-describedby={whatsappError ? `${ids.whatsapp}-error` : undefined}
              className={`${inputClass} ${inputBorder(whatsappError)}`}
            />
            {whatsappError && (
              <p id={`${ids.whatsapp}-error`} className={errorClass}>
                {whatsappError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.project} className={labelClass}>
              Service Description
            </label>
            <input
              id={ids.project}
              type="text"
              value={values.project}
              onChange={(e) => setField('project', e.target.value)}
              placeholder="e.g. Landing page redesign"
              aria-invalid={projectError ? true : undefined}
              aria-describedby={projectError ? `${ids.project}-error` : undefined}
              className={`${inputClass} ${inputBorder(projectError)}`}
            />
            {projectError && (
              <p id={`${ids.project}-error`} className={errorClass}>
                {projectError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={ids.issueDate} className={labelClass}>
                Issue Date
              </label>
              <input
                id={ids.issueDate}
                type="date"
                value={values.issueDate}
                onChange={(e) => setField('issueDate', e.target.value)}
                aria-invalid={issueError ? true : undefined}
                aria-describedby={issueError ? `${ids.issueDate}-error` : undefined}
                className={`${inputClass} ${inputBorder(issueError)} dark:[color-scheme:dark]`}
              />
              {issueError && (
                <p id={`${ids.issueDate}-error`} className={errorClass}>
                  {issueError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={ids.dueDate} className={labelClass}>
                Payment Due Date
              </label>
              <input
                id={ids.dueDate}
                type="date"
                min={values.issueDate}
                value={values.dueDate}
                onChange={(e) => setField('dueDate', e.target.value)}
                aria-invalid={dueError ? true : undefined}
                aria-describedby={dueError ? `${ids.dueDate}-error` : undefined}
                className={`${inputClass} ${inputBorder(dueError)} dark:[color-scheme:dark]`}
              />
              {dueError && (
                <p id={`${ids.dueDate}-error`} className={errorClass}>
                  {dueError}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" disabled={submitDisabled} className={primaryButtonClass}>
              Create invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
