import { PERSONA_DATA } from './personas';
import type { Invoice, Client, Expense } from './types';

// In-memory server-side state initialized from personas
interface ServerDB {
  invoices: Invoice[];
  clients: Client[];
  expenses: Expense[];
  webhooksLogged: Array<{
    id: string;
    invoiceId: string;
    utr: string;
    amount: number;
    timestamp: string;
    status: 'success' | 'failed';
  }>;
}

function initDB(): ServerDB {
  // Aggregate all persona initial records
  const allInvoices: Invoice[] = [
    ...PERSONA_DATA.designer.invoices,
    ...PERSONA_DATA.tutor.invoices,
    ...PERSONA_DATA.clinic.invoices,
  ];

  const allClients: Client[] = [
    ...PERSONA_DATA.designer.clients,
    ...PERSONA_DATA.tutor.clients,
    ...PERSONA_DATA.clinic.clients,
  ];

  const allExpenses: Expense[] = [
    ...PERSONA_DATA.designer.expenses,
    ...PERSONA_DATA.tutor.expenses,
    ...PERSONA_DATA.clinic.expenses,
  ];

  return {
    invoices: allInvoices,
    clients: allClients,
    expenses: allExpenses,
    webhooksLogged: [],
  };
}

// Global singleton for serverless container warm executions
declare global {
  var __CASHPULSE_SERVER_DB__: ServerDB | undefined;
}

export function getServerDB(): ServerDB {
  if (!global.__CASHPULSE_SERVER_DB__) {
    global.__CASHPULSE_SERVER_DB__ = initDB();
  }
  return global.__CASHPULSE_SERVER_DB__;
}
