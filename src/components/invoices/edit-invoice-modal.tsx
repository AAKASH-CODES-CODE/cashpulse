'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Invoice } from '../../lib/types';

export interface EditInvoicePatch {
  amount: number;
  project: string;
  dueDate: string;
}

export interface EditInvoiceModalProps {
  invoice: Invoice | null;
  clientName: string;
  open: boolean;
  onClose: () => void;
  onSave: (patch: EditInvoicePatch) => void;
}

interface FormValues {
  project: string;
  amount: string;
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

function validate(values: FormValues, issueDate: string): FormErrors {
  const errors: FormErrors = {};
  if (values.project.trim() === '') errors.project = 'Service description is required.';

  const amount = Number(values.amount);
  if (values.amount.trim() === '') errors.amount = 'Enter an amount.';
  else if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be greater than ₹0.';

  if (!ISO_DATE.test(values.dueDate)) {
    errors.dueDate = 'Payment due date is required.';
  } else if (values.dueDate < issueDate) {
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

export function EditInvoiceModal({ invoice, clientName, open, onClose, onSave }: EditInvoiceModalProps) {
  if (!open || invoice === null) return null;
  return (
    <EditInvoiceForm
      key={invoice.id}
      invoice={invoice}
      clientName={clientName}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

interface EditInvoiceFormProps {
  invoice: Invoice;
  clientName: string;
  onClose: () => void;
  onSave: (patch: EditInvoicePatch) => void;
}

function EditInvoiceForm({ invoice, clientName, onClose, onSave }: EditInvoiceFormProps) {
  const uid = useId();
  const [values, setValues] = useState<FormValues>(() => ({
    project: invoice.project,
    amount: String(invoice.amount),
    dueDate: invoice.dueDate,
  }));
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

  const errors = validate(values, invoice.issueDate);
  const isValid = Object.keys(errors).length === 0;

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      amount: Number(values.amount),
      project: values.project.trim(),
      dueDate: values.dueDate,
    });
  };

  const shownError = (key: keyof FormValues): string | undefined =>
    touched[key] ? errors[key] : undefined;

  const ids = {
    project: `${uid}-project`,
    amount: `${uid}-amount`,
    dueDate: `${uid}-due-date`,
    title: `${uid}-title`,
  };

  const projectError = shownError('project');
  const amountError = shownError('amount');
  const dueError = shownError('dueDate');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
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
          <div className="min-w-0">
            <h2 id={ids.title} className="text-lg font-semibold text-slate-900">
              Edit invoice {invoice.number}
            </h2>
            <p className="truncate text-xs text-slate-500">Client: {clientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-press cursor-pointer shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor={ids.project} className={labelClass}>
              Service Description
            </label>
            <input
              id={ids.project}
              type="text"
              value={values.project}
              onChange={(e) => setField('project', e.target.value)}
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

          <div>
            <label htmlFor={ids.dueDate} className={labelClass}>
              Payment Due Date
            </label>
            <input
              id={ids.dueDate}
              type="date"
              min={invoice.issueDate}
              value={values.dueDate}
              onChange={(e) => setField('dueDate', e.target.value)}
              aria-invalid={dueError ? true : undefined}
              aria-describedby={dueError ? `${ids.dueDate}-error` : undefined}
              className={`${inputClass} ${inputBorder(dueError)} [color-scheme:dark]`}
            />
            {dueError && (
              <p id={`${ids.dueDate}-error`} className={errorClass}>
                {dueError}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" disabled={!isValid} className={primaryButtonClass}>
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
