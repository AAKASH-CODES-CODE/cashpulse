'use client';

import { useSyncExternalStore } from 'react';
import type { AppState, BusinessPersona, Client, Expense, Invoice, Plan } from './types';
import { createSeedState } from './seed';
import * as store from './store';

let clientSnapshot: AppState | null = null;
let serverSnapshot: AppState | null = null;
const listeners = new Set<() => void>();

function getClientSnapshot(): AppState {
  if (clientSnapshot === null) clientSnapshot = store.loadState();
  return clientSnapshot;
}

function getServerSnapshot(): AppState {
  if (serverSnapshot === null) serverSnapshot = createSeedState();
  return serverSnapshot;
}

function subscribe(onChange: () => void): () => void {
  // Own writes already set the snapshot; only other tabs need a re-read from storage.
  const handleOwnChange = (): void => {
    onChange();
  };
  const handleExternalChange = (event: StorageEvent): void => {
    // Read-only: a change from another tab must never be written back to storage.
    // Ignore unrelated keys, cleared storage (null newValue) and unreadable values.
    if (event.key !== null && event.key !== store.STORAGE_KEY) return;
    const next = store.parseStoredState(event.newValue);
    if (next === null) return;
    clientSnapshot = next;
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener(store.STORE_CHANGE_EVENT, handleOwnChange);
  window.addEventListener('storage', handleExternalChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener(store.STORE_CHANGE_EVENT, handleOwnChange);
    window.removeEventListener('storage', handleExternalChange);
  };
}

function current(): AppState {
  return getClientSnapshot();
}

/** Sets React-visible state to the value just computed, then persists it. */
function commit(next: AppState): void {
  clientSnapshot = next;
  if (!store.saveState(next)) {
    // Save failed (no change event dispatched), so notify subscribers directly to keep the edit visible.
    listeners.forEach((listener) => listener());
  }
}

function apply(update: (state: AppState) => AppState): void {
  const prev = current();
  const next = update(prev);
  if (next !== prev) commit(next);
}

export function useCashPulseStore() {
  const state = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return {
    state,
    addClient: (input: { name: string; whatsapp: string }): string => {
      const next = store.addClient(current(), input);
      commit(next);
      const created: Client | undefined = next.clients[next.clients.length - 1];
      return created?.id ?? '';
    },
    addInvoice: (invoice: Invoice): void => {
      apply((s) => store.addInvoice(s, invoice));
    },
    updateInvoice: (invoice: Invoice): void => {
      apply((s) => store.updateInvoice(s, invoice));
    },
    markInvoicePaid: (id: string, today?: Date, utr?: string): void => {
      apply((s) => store.markInvoicePaid(s, id, today, utr));
    },
    deleteInvoice: (id: string): void => {
      apply((s) => store.deleteInvoice(s, id));
    },
    addExpense: (expense: Expense): void => {
      apply((s) => store.addExpense(s, expense));
    },
    updateExpense: (expense: Expense): void => {
      apply((s) => store.updateExpense(s, expense));
    },
    deleteExpense: (id: string): void => {
      apply((s) => store.deleteExpense(s, id));
    },
    setBankBalance: (balance: number): void => {
      apply((s) => store.setBankBalance(s, balance));
    },
    setPlan: (plan: Plan): void => {
      apply((s) => store.setPlan(s, plan));
    },
    resetDemoData: (): void => {
      commit(createSeedState());
    },
    switchPersona: (persona: BusinessPersona): void => {
      commit(store.switchPersona(persona));
    },
  };
}
