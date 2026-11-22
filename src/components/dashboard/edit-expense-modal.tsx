'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Expense } from '../../lib/types';

export interface EditExpensePatch {
  name: string;
  amount: number;
  dueDay: number;
  category: string;
}

export interface EditExpenseModalProps {
  expense: Expense | null;
  open: boolean;
  onClose: () => void;
  onSave: (patch: EditExpensePatch) => void;
}

interface FormValues {
  name: string;
  amount: string;
  dueDay: string;
  category: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const inputClass =
  'w-full rounded-xl border bg-zinc-950/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition motion-safe:duration-200 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:opacity-40';

function inputBorder(error: string | undefined): string {
  return error ? 'border-rose-500/60' : 'border-white/10';
}

const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-400';
const errorClass = 'mt-1.5 text-xs text-rose-400';
const secondaryButtonClass =
  'tap-press cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 hover:border-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900';
const primaryButtonClass =
  'tap-bounce cursor-pointer rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-900/30 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 motion-safe:duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:brightness-100';

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.name.trim() === '') errors.name = 'Bill name is required.';
  if (values.category.trim() === '') errors.category = 'Category is required.';

  const amount = Number(values.amount);
  if (values.amount.trim() === '') errors.amount = 'Enter an amount.';
  else if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be greater than ₹0.';

  const dueDay = Number(values.dueDay);
  if (values.dueDay.trim() === '') errors.dueDay = 'Enter a due day.';
  else if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    errors.dueDay = 'Due day must be a whole number from 1 to 31.';
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

export function EditExpenseModal({ expense, open, onClose, onSave }: EditExpenseModalProps) {
  if (!open || expense === null) return null;
  return <EditExpenseForm key={expense.id} expense={expense} onClose={onClose} onSave={onSave} />;
}

interface EditExpenseFormProps {
  expense: Expense;
  onClose: () => void;
  onSave: (patch: EditExpensePatch) => void;
}

function EditExpenseForm({ expense, onClose, onSave }: EditExpenseFormProps) {
  const uid = useId();
  const [values, setValues] = useState<FormValues>(() => ({
    name: expense.name,
    amount: String(expense.amount),
    dueDay: String(expense.dueDay),
    category: expense.category,
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

  const errors = validate(values);
  const isValid = Object.keys(errors).length === 0;

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      name: values.name.trim(),
      amount: Number(values.amount),
      dueDay: Number(values.dueDay),
      category: values.category.trim(),
    });
  };

  const shownError = (key: keyof FormValues): string | undefined =>
    touched[key] ? errors[key] : undefined;

  const ids = {
    name: `${uid}-name`,
    amount: `${uid}-amount`,
    dueDay: `${uid}-due-day`,
    category: `${uid}-category`,
    title: `${uid}-title`,
  };

  const nameError = shownError('name');
  const amountError = shownError('amount');
  const dueDayError = shownError('dueDay');
  const categoryError = shownError('category');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-950/70 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        className="spring-dialog relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-900/90 p-5 text-zinc-100 shadow-2xl shadow-black/50 ring-1 ring-white/5 backdrop-blur-xl md:rounded-2xl md:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 id={ids.title} className="text-lg font-semibold text-zinc-50">
              Edit recurring bill
            </h2>
            <p className="truncate text-xs text-zinc-400">{expense.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-press cursor-pointer shrink-0 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-zinc-100 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor={ids.name} className={labelClass}>
              Bill Name
            </label>
            <input
              id={ids.name}
              type="text"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? `${ids.name}-error` : undefined}
              className={`${inputClass} ${inputBorder(nameError)}`}
            />
            {nameError && (
              <p id={`${ids.name}-error`} className={errorClass}>
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
            <label htmlFor={ids.dueDay} className={labelClass}>
              Due Day of Month (1–31)
            </label>
            <input
              id={ids.dueDay}
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              step={1}
              value={values.dueDay}
              onChange={(e) => setField('dueDay', e.target.value)}
              aria-invalid={dueDayError ? true : undefined}
              aria-describedby={dueDayError ? `${ids.dueDay}-error` : undefined}
              className={`${inputClass} ${inputBorder(dueDayError)}`}
            />
            {dueDayError && (
              <p id={`${ids.dueDay}-error`} className={errorClass}>
                {dueDayError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.category} className={labelClass}>
              Category
            </label>
            <input
              id={ids.category}
              type="text"
              value={values.category}
              onChange={(e) => setField('category', e.target.value)}
              aria-invalid={categoryError ? true : undefined}
              aria-describedby={categoryError ? `${ids.category}-error` : undefined}
              className={`${inputClass} ${inputBorder(categoryError)}`}
            />
            {categoryError && (
              <p id={`${ids.category}-error`} className={errorClass}>
                {categoryError}
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
