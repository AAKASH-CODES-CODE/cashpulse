'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useCashPulseStore } from '../../lib/use-store';
import {
  addClient as addClientToState,
  addInvoice as addInvoiceToState,
  canCreateInvoice,
  createId,
} from '../../lib/store';
import { buildCaCsv } from '../../lib/intelligence';
import { MessageCircle } from 'lucide-react';
import { agingBucket, getInvoiceStatus, type AgingBucket } from '../../lib/forecast';
import { daysOverdue, formatINR } from '../../lib/money';
import type { Plan, Scenario } from '../../lib/types';
import { ChaseDrawer } from '../chase/chase-drawer';
import { StallDetector } from '../chase/stall-detector';
import { CreateInvoiceModal, type CreateInvoiceInput } from '../invoices/create-invoice-modal';
import { EditInvoiceModal, type EditInvoicePatch } from '../invoices/edit-invoice-modal';
import { ForecastChart } from '../forecast/forecast-chart';
import { BackToTop } from '../layout/back-to-top';
import { BottomNav } from '../layout/bottom-nav';
import { SectionNav, type SectionNavItem } from '../layout/section-nav';
import { TopNav } from '../layout/top-nav';
import { PricingModal } from '../pricing/pricing-modal';
import { RecoveryMode } from '../recovery/recovery-mode';
import { WhatIfSimulator } from '../scenario/what-if-simulator';
import { PitchTour, type PitchTourStep } from '../tour/pitch-tour';
import { VoiceInvoice } from '../voice/voice-invoice';
import { ActionBanner } from './action-banner';
import { AgingBuckets } from './aging-buckets';
import { ContractorDeferral } from './contractor-deferral';
import { DebtRadar } from './debt-radar';
import { EditExpenseModal, type EditExpensePatch } from './edit-expense-modal';
import { ExpensesPanel } from './expenses-panel';
import { InvoicesTable, type InvoiceRow } from './invoices-table';
import { KarmaPanel } from './karma-panel';
import { MetricDetailDrawer, type MetricKey } from './metric-detail-drawer';
import { MetricCards } from './metric-cards';
import { SafeToSpendRing } from './safe-to-spend-ring';
import { BadDayTriageModal } from './bad-day-triage-modal';
import { ApiConsoleDrawer } from './api-console-drawer';
import { NotebookRoiCard } from './notebook-roi-card';
import { QuickPasteParser } from '../invoices/quick-paste-parser';

const UPI_ID = 'cashpulse@upi';
const SENDER_NAME = 'CashPulse Freelancer';

const PITCH_STEPS: PitchTourStep[] = [
  {
    id: 'persona-switcher',
    targetId: 'top-nav-persona',
    title: 'Multi-Persona Engine: Designer, Tutor & Clinic',
    category: '🎨 Business Flexibility',
    categoryColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    body: 'CashPulse adapts instantly to your exact solo business model. Switch in 1 click between Creative Agency, Home Tutor / Coaching, and Small Clinic / Salon. All client rosters, invoices, fee cadences, and milestone deliverables re-seed immediately.',
    highlights: ['3 Solo Business Personas', 'Instant Data & Tone Shift', '100% INR Localized'],
    section: 'overview',
    actionLabel: 'Switch Persona',
  },
  {
    id: 'metric-cards',
    targetId: 'metric-cards',
    title: 'Live Cash Snapshot & 90-Day Runway',
    category: '💰 Financial Health',
    categoryColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    body: 'Replaces messy paper registers and spreadsheet guesswork. Monitors 4 vital signs: Bank Balance, Unpaid Receivables, Overdue Arrears, and projected Survival Runway in days before cash hits ₹0.',
    highlights: ['Calculated Daily', 'Zero Manual Ledger Entry', 'Early Danger Warnings'],
    section: 'overview',
  },
  {
    id: 'notebook-roi',
    targetId: 'notebook-roi-card',
    title: 'Notebook vs CashPulse: 68x Commercial ROI',
    category: '📈 Commercial Proof',
    categoryColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    body: 'Hard empirical proof for hackathon commercial viability: cuts payment chasing from 8.5 hours/week to 45 seconds, accelerates UPI settlement by 27 days, and slashes client defaults from 14.2% down to 1.1%.',
    highlights: ['68x Commercial ROI', '34 Hours/Mo Saved', '27 Days Faster UPI Receipts'],
    section: 'overview',
  },
  {
    id: 'action-banner',
    targetId: 'action-banner',
    title: '1-Click WhatsApp Follow-Up & Tone Engine',
    category: '📱 Client Recovery',
    categoryColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    body: 'Automates polite-yet-firm client chasing on WhatsApp. Drafts tone-aware messages (Friendly before due date, Firm for 7d late, Urgent for 14d+) pre-populated with direct UPI QR payment links.',
    highlights: ['Smart Tone Escalation', 'Direct UPI Deep-Link', 'Zero Awkward Phone Calls'],
    section: 'overview',
  },
  {
    id: 'bad-day-protocol',
    targetId: 'bad-day-protocol-trigger',
    title: 'Bad Day Protocol: Emergency Multi-Client Triage',
    category: '🚨 Emergency Mode',
    categoryColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    body: 'Designed for the nightmare scenario when 5 clients delay payments simultaneously. Activates emergency cash triage: prioritizes debts by exposure, launches batch WhatsApp chase, and freezes non-essential expenses to rescue +28 days of runway.',
    highlights: ['+28 Days Runway Rescued', 'Ranked Priority Queue', 'Discretionary Expense Freeze'],
    section: 'overview',
    actionLabel: 'Open Bad Day Protocol',
  },
  {
    id: 'quick-paste',
    targetId: 'quick-paste-trigger',
    title: 'AI WhatsApp Chat & Deal Receipt Parser',
    category: '🤖 AI Automation',
    categoryColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    body: 'Solo operators agree to terms in messy WhatsApp chats. Simply paste the chat message (e.g. "TechCorp mobile redesign for 45k due Friday") — built-in NLP automatically extracts amount, client name, due date, and locks deliverables.',
    highlights: ['1-Second Deal Ingestion', 'Auto-Parses 45k & Dates', 'Locks Milestone Deliverables'],
    section: 'overview',
    actionLabel: 'Try Quick Paste',
  },
  {
    id: 'debt-radar',
    targetId: 'debt-radar',
    title: 'Debt Radar & Chronic Stall Detector',
    category: '🎯 Risk Intelligence',
    categoryColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    body: 'Visualizes who owes you money and groups them into 1-15d, 16-30d, and 30d+ aging buckets. The Stall Detector flags repeat delay excuses before a slow client turns into a written-off bad debt.',
    highlights: ['Aging Buckets', 'Stall Detector Alerts', 'Exposure-Ranked Sorting'],
    section: 'debt',
  },
  {
    id: 'forecast',
    targetId: 'forecast',
    title: 'Financial Command Center & What-If Simulator',
    category: '🔮 Predictive Engine',
    categoryColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    body: 'Stress-test your cashflow before making commitments. Simulate: "What if my largest client delays by 30 days?" or "What if a payment defaults?" The 90-day curve immediately highlights the exact danger day.',
    highlights: ['90-Day Interactive SVG Chart', 'Simulate Delays & Defaults', 'Zero-Cash Date Warning'],
    section: 'forecast',
  },
  {
    id: 'safe-to-spend',
    targetId: 'safe-to-spend',
    title: 'Safe-to-Spend Ring & Client Karma Guard',
    category: '🛡️ Runway Shield',
    categoryColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    body: 'Prevents overspending by locking aside rent and tax reserves. Client Karma grades every client (A to F) based on settlement velocity, automatically prescribing 30% to 50% advance deposits for risky payers.',
    highlights: ['Tax & Rent Ring-Fencing', 'Karma Reliability Scoring (A-F)', 'Advance Deposit Policy Engine'],
    section: 'tools',
  },
  {
    id: 'invoices',
    targetId: 'invoices',
    title: 'Invoices Table & Milestone Deliverable Vault',
    category: '🔒 Escrow Deliverables',
    categoryColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    body: 'Complete invoice ledger with dedicated /pay/[id] escrow pages. Work files (Figma, code, reports) remain encrypted and locked until the client scans the UPI QR code and clears payment, unlocking instant verified downloads.',
    highlights: ['Direct NPCI UPI QR Links', 'Encrypted Deliverable Vault', 'Automatic Payment Verification'],
    section: 'invoices',
  },
  {
    id: 'contractor-deferral',
    targetId: 'contractor-deferral',
    title: 'Contractor Expense Deferral & Cash Shield',
    category: '💼 Expense Optimization',
    categoryColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    body: 'Separates fixed bills (studio rent, server hosting) from flexible vendor payouts. Recommends safe deferral schedules to protect your runway without damaging contractor relationships.',
    highlights: ['Fixed vs Flexible Categorization', 'Safe Vendor Deferrals', 'Runway Defense Strategy'],
    section: 'invoices',
  },
  {
    id: 'api-console',
    targetId: 'api-console-trigger',
    title: 'Developer REST API, Webhooks & CA CSV',
    category: '⚡ Live Backend',
    categoryColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    body: 'Full-stack serverless architecture running live on Next.js. Inspect live REST endpoints (/api/invoices, /api/health), test real UPI webhooks, and download CA-ready tax ledgers in streamable RFC CSV format.',
    highlights: ['Serverless Route Handlers', 'NPCI UPI Webhook Engine', '1-Click CA Audit CSV Streaming'],
    section: 'overview',
    actionLabel: 'Open API Console',
  },
];

type DashboardSection = 'overview' | 'debt' | 'forecast' | 'recovery' | 'invoices' | 'tools';

/** Maps pitch-tour step ids to dashboard section ids. Unmapped step ids are ignored. */
const TOUR_STEP_SECTIONS: Partial<Record<string, DashboardSection>> = {
  overview: 'overview',
  'debt-radar': 'debt',
  forecast: 'forecast',
  recovery: 'recovery',
  'safe-to-spend': 'tools',
  invoices: 'invoices',
};

const SECTIONS: readonly SectionNavItem<DashboardSection>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'debt', label: 'Debt Radar' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'tools', label: 'Tools' },
];

/** Re-reads the local date when the page regains focus or becomes visible (e.g. after midnight). */
function subscribeToClock(onStoreChange: () => void): () => void {
  window.addEventListener('focus', onStoreChange);
  document.addEventListener('visibilitychange', onStoreChange);
  return () => {
    window.removeEventListener('focus', onStoreChange);
    document.removeEventListener('visibilitychange', onStoreChange);
  };
}

/** Local midnight as epoch ms on the client; null on the server (no date is rendered there). */
function getClientTodayMs(): number | null {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getServerTodayMs(): number | null {
  return null;
}

interface DashboardViewProps {
  onChase?: (invoiceId: string) => void;
  onEdit?: (invoiceId: string) => void;
}

/** Next invoice number for a year, formatted INV-<year>-<3-digit sequence>. */
function nextInvoiceNumber(existing: readonly { number: string }[], year: number): string {
  const prefix = `INV-${year}-`;
  let max = 0;
  for (const inv of existing) {
    if (!inv.number.startsWith(prefix)) continue;
    const seq = Number.parseInt(inv.number.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export function DashboardView({ onChase, onEdit }: DashboardViewProps) {
  const todayMs = useSyncExternalStore<number | null>(subscribeToClock, getClientTodayMs, getServerTodayMs);
  const today = useMemo(() => (todayMs === null ? null : new Date(todayMs)), [todayMs]);

  if (today === null) return <DashboardSkeleton />;
  return <DashboardContent today={today} onChase={onChase} onEdit={onEdit} />;
}

interface DashboardContentProps {
  today: Date;
  onChase?: (invoiceId: string) => void;
  onEdit?: (invoiceId: string) => void;
}

function DashboardContent({ today, onChase, onEdit }: DashboardContentProps) {
  const {
    state,
    markInvoicePaid,
    addClient,
    addInvoice,
    updateInvoice,
    updateExpense,
    deleteExpense,
    setPlan,
    resetDemoData,
    switchPersona,
  } = useCashPulseStore();
  const [activeBucket, setActiveBucket] = useState<AgingBucket | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chaseInvoiceId, setChaseInvoiceId] = useState<string | null>(null);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [apiConsoleOpen, setApiConsoleOpen] = useState(false);
  const [badDayOpen, setBadDayOpen] = useState(false);
  const [quickPasteOpen, setQuickPasteOpen] = useState(false);
  const [scenario, setScenario] = useState<Scenario | undefined>(undefined);
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);

  const rows = useMemo<InvoiceRow[]>(() => {
    const clientNames = new Map<string, string>(
      state.clients.map((c): [string, string] => [c.id, c.name]),
    );
    return state.invoices
      .map((inv) => ({ ...inv, clientName: clientNames.get(inv.clientId) ?? 'Unknown client' }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [state]);

  const visibleRows = useMemo<InvoiceRow[]>(() => {
    if (activeBucket === null) return rows;
    return rows.filter(
      (row) =>
        row.paidDate === undefined &&
        agingBucket(daysOverdue(row.dueDate, today)) === activeBucket,
    );
  }, [rows, activeBucket, today]);

  const chaseInvoice = useMemo(
    () =>
      chaseInvoiceId === null
        ? null
        : (state.invoices.find((inv) => inv.id === chaseInvoiceId) ?? null),
    [state, chaseInvoiceId],
  );
  const chaseClient =
    chaseInvoice === null ? undefined : state.clients.find((c) => c.id === chaseInvoice.clientId);

  const editInvoice = useMemo(
    () =>
      editInvoiceId === null
        ? null
        : (state.invoices.find((inv) => inv.id === editInvoiceId) ?? null),
    [state, editInvoiceId],
  );
  const editClientName =
    editInvoice === null
      ? ''
      : (state.clients.find((c) => c.id === editInvoice.clientId)?.name ?? 'Unknown client');

  const editExpense = useMemo(
    () =>
      editExpenseId === null
        ? null
        : (state.expenses.find((e) => e.id === editExpenseId) ?? null),
    [state, editExpenseId],
  );

  const firstOverdue = rows.find(
    (row) => row.paidDate === undefined && daysOverdue(row.dueDate, today) > 0,
  );

  const chaseToday = useMemo(
    () =>
      rows
        .filter((row) => getInvoiceStatus(row, today) === 'overdue')
        .map((row) => ({ row, days: daysOverdue(row.dueDate, today) }))
        .sort((a, b) => b.days - a.days || b.row.amount - a.row.amount)
        .slice(0, 5),
    [rows, today],
  );

  const handleChase = (id: string): void => {
    setSelectedId(id);
    setChaseInvoiceId(id);
    onChase?.(id);
  };

  const handleCloseChase = (): void => {
    setChaseInvoiceId(null);
  };

  const handleEdit = (id: string): void => {
    setSelectedId(id);
    setEditInvoiceId(id);
    onEdit?.(id);
  };

  const handleCloseEdit = (): void => {
    setEditInvoiceId(null);
  };

  const handleSaveEdit = (patch: EditInvoicePatch): void => {
    if (editInvoice === null) return;
    updateInvoice({ ...editInvoice, ...patch });
    setEditInvoiceId(null);
  };

  const handleMarkPaid = (id: string): void => {
    markInvoicePaid(id, today);
  };

  const handleExportCa = async (): Promise<void> => {
    try {
      const res = await fetch('/api/export/ca-ledger');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cashpulse-ca-ledger-${today.toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fallback to client-computed CSV
    }
    const csv = buildCaCsv(state, today);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cashpulse-ca-ledger.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleEditExpense = (id: string): void => {
    setEditExpenseId(id);
  };

  const handleCloseEditExpense = (): void => {
    setEditExpenseId(null);
  };

  const handleSaveExpense = (patch: EditExpensePatch): void => {
    if (editExpense === null) return;
    updateExpense({ ...editExpense, ...patch });
    setEditExpenseId(null);
  };

  const handleDeleteExpense = (id: string): void => {
    if (!window.confirm('Delete this recurring bill?')) return;
    deleteExpense(id);
  };

  const handleCreate = (input: CreateInvoiceInput): void => {
    if (!canCreateInvoice(state, today)) return;
    const isNewClient = input.clientId === '';
    // Dry run on a copy of the state first, so a rejected invoice never leaves an orphan client behind.
    const pendingState = isNewClient
      ? addClientToState(state, { name: input.clientName, whatsapp: input.whatsapp })
      : state;
    const draft = {
      id: createId('inv'),
      number: nextInvoiceNumber(state.invoices, today.getFullYear()),
      clientId: isNewClient ? (pendingState.clients[pendingState.clients.length - 1]?.id ?? '') : input.clientId,
      project: input.project,
      amount: input.amount,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
    };
    // addInvoice returns the same state object when it rejects the invoice (validation or free-plan limit).
    if (addInvoiceToState(pendingState, draft) === pendingState) return;
    const clientId = isNewClient
      ? addClient({ name: input.clientName, whatsapp: input.whatsapp })
      : input.clientId;
    addInvoice({ ...draft, clientId });
  };

  const handleUpgrade = (): void => {
    setPlan('pro');
    setCreateOpen(false);
  };

  const handleOpenCreate = (): void => {
    setCreateOpen(true);
  };

  const handleReset = (): void => {
    if (!window.confirm('Reset all demo data to the original sample state?')) return;
    resetDemoData();
    setActiveBucket(null);
    setSelectedId(null);
    setChaseInvoiceId(null);
    setEditInvoiceId(null);
    setCreateOpen(false);
    setPricingOpen(false);
    setScenario(undefined);
    setSelectedMetric(null);
  };

  const sectionClass = (section: DashboardSection): string =>
    section === activeSection ? 'cp-animate-in' : 'hidden';

  const handleTourStep = (step: PitchTourStep): void => {
    if (step.section !== undefined && step.section !== activeSection) {
      setActiveSection(step.section);
    }
  };

  const handleTriggerTourAction = (actionKey: string): void => {
    if (actionKey === 'persona-switcher') {
      const nextPersona =
        state.persona === 'designer' ? 'tutor' : state.persona === 'tutor' ? 'clinic' : 'designer';
      switchPersona(nextPersona);
    } else if (actionKey === 'bad-day-protocol') {
      setBadDayOpen(true);
    } else if (actionKey === 'quick-paste') {
      setQuickPasteOpen(true);
    } else if (actionKey === 'api-console') {
      setApiConsoleOpen(true);
    }
  };

  const handleOpenPricing = (): void => {
    setPricingOpen(true);
  };

  const handleClosePricing = (): void => {
    setPricingOpen(false);
  };

  const handleChoosePlan = (plan: Plan): void => {
    setPlan(plan);
    setPricingOpen(false);
  };

  return (
    <>
      <TopNav
        onNewInvoice={handleOpenCreate}
        onReset={handleReset}
        plan={state.plan}
        onOpenPricing={handleOpenPricing}
        onExportCa={handleExportCa}
        currentPersona={state.persona || 'designer'}
        onSwitchPersona={switchPersona}
        onOpenApiConsole={() => setApiConsoleOpen(true)}
        onOpenBadDayProtocol={() => setBadDayOpen(true)}
        onOpenQuickPaste={() => setQuickPasteOpen(true)}
      />
      <SectionNav sections={SECTIONS} active={activeSection} onSelect={setActiveSection} />
      <div className="flex flex-col gap-6 pb-20 md:pb-0">
        <PitchTour
          steps={PITCH_STEPS}
          onStepChange={handleTourStep}
          onTriggerAction={handleTriggerTourAction}
        />
        <div id="overview" className={`flex scroll-mt-20 flex-col gap-6 ${sectionClass('overview')}`}>
          <div id="metric-cards">
            <MetricCards state={state} today={today} onSelect={setSelectedMetric} />
          </div>
          <NotebookRoiCard />
          <div id="action-banner">
            <ActionBanner rows={rows} today={today} onChase={handleChase} />
          </div>
          <section id="chase-today" aria-labelledby="chase-today-heading" className="cp-card flex flex-col gap-4">
            <div>
              <h2 id="chase-today-heading" className="text-base font-semibold text-slate-900">
                Chase today
              </h2>
              <p className="cp-muted text-xs">Overdue invoices, most urgent first</p>
            </div>
            {chaseToday.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No overdue invoices. Nothing to chase today.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-200">
                {chaseToday.map(({ row, days }) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{row.clientName}</p>
                      <p className="text-xs text-slate-500">
                        {days} {days === 1 ? 'day' : 'days'} overdue
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatINR(row.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChase(row.id)}
                        className="tap-press inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        Chase
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div
          id="safe-to-spend"
          className={`grid scroll-mt-20 grid-cols-1 gap-6 lg:grid-cols-2 ${sectionClass('tools')}`}
        >
          <SafeToSpendRing state={state} today={today} />
          <KarmaPanel state={state} today={today} />
        </div>
        <div className={sectionClass('debt')}>
          <AgingBuckets
            state={state}
            today={today}
            activeBucket={activeBucket}
            onBucketChange={setActiveBucket}
          />
        </div>
        <div id="recovery" className={`scroll-mt-20 ${sectionClass('recovery')}`}>
          <RecoveryMode state={state} today={today} onChase={handleChase} onMarkPaid={handleMarkPaid} />
        </div>
        <section
          id="forecast"
          aria-labelledby="forecast-heading"
          className={`flex scroll-mt-20 flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 ${sectionClass('forecast')}`}
        >
          <div className="flex flex-col gap-1">
            <h2 id="forecast-heading" className="text-lg font-semibold text-slate-900">
              Financial Command Center
            </h2>
            <p className="text-sm text-slate-600">Adjust a client or invoice and watch your runway move.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_340px]">
            <ForecastChart state={state} scenario={scenario} today={today} />
            <WhatIfSimulator
              state={state}
              today={today}
              scenario={scenario}
              onScenarioChange={setScenario}
            />
          </div>
        </section>
        <div id="debt-radar" className={`flex scroll-mt-20 flex-col gap-4 ${sectionClass('debt')}`}>
          <DebtRadar state={state} today={today} onChase={handleChase} />
          {firstOverdue === undefined ? null : (
            <StallDetector
              clientName={firstOverdue.clientName}
              invoiceNumber={firstOverdue.number}
              amount={firstOverdue.amount}
              dueDate={firstOverdue.dueDate}
            />
          )}
        </div>
        <div className={`grid grid-cols-1 gap-6 lg:grid-cols-3 ${sectionClass('invoices')}`}>
          <section
            id="invoices"
            aria-labelledby="invoices-heading"
            className="flex scroll-mt-20 flex-col gap-3 lg:col-span-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="invoices-heading" className="text-lg font-semibold text-slate-900">
                Who owes me
              </h2>
              {activeBucket !== null && (
                <button
                  type="button"
                  onClick={() => setActiveBucket(null)}
                  className="tap-press cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Clear filter
                </button>
              )}
            </div>
            <InvoicesTable
              rows={visibleRows}
              today={today}
              selectedId={selectedId}
              onMarkPaid={handleMarkPaid}
              onEdit={handleEdit}
              onChase={handleChase}
            />
          </section>
          <div className="flex flex-col gap-6 lg:col-span-1">
            <ExpensesPanel
              expenses={state.expenses}
              today={today}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
            />
            <div id="contractor-deferral">
              <ContractorDeferral expenses={state.expenses} />
            </div>
          </div>
        </div>

        <VoiceInvoice
          clients={state.clients}
          canCreate={canCreateInvoice(state, today)}
          onCreate={handleCreate}
        />

        <ChaseDrawer
          invoice={chaseInvoice}
          client={chaseClient}
          upiId={UPI_ID}
          senderName={SENDER_NAME}
          open={chaseInvoice !== null}
          onClose={handleCloseChase}
          onMarkPaid={handleMarkPaid}
        />

        <MetricDetailDrawer
          metric={selectedMetric}
          state={state}
          today={today}
          onClose={() => setSelectedMetric(null)}
        />

        <EditInvoiceModal
          invoice={editInvoice}
          clientName={editClientName}
          open={editInvoice !== null}
          onClose={handleCloseEdit}
          onSave={handleSaveEdit}
        />

        <EditExpenseModal
          expense={editExpense}
          open={editExpense !== null}
          onClose={handleCloseEditExpense}
          onSave={handleSaveExpense}
        />

        <CreateInvoiceModal
          open={createOpen}
          clients={state.clients}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
          canCreate={canCreateInvoice(state, today)}
          onUpgrade={handleUpgrade}
        />

        <PricingModal
          open={pricingOpen}
          currentPlan={state.plan}
          onClose={handleClosePricing}
          onChoosePlan={handleChoosePlan}
        />

        <BadDayTriageModal
          isOpen={badDayOpen}
          onClose={() => setBadDayOpen(false)}
          state={state}
        />

        <ApiConsoleDrawer
          isOpen={apiConsoleOpen}
          onClose={() => setApiConsoleOpen(false)}
        />

        <QuickPasteParser
          isOpen={quickPasteOpen}
          onClose={() => setQuickPasteOpen(false)}
          state={state}
          onAddInvoice={(newInv) => addInvoice(newInv)}
        />

        <BottomNav sections={SECTIONS} active={activeSection} onSelect={setActiveSection} />
        <BackToTop />
      </div>
    </>
  );
}

/** Placeholder shown until the client-only date exists, so no date-dependent number is rendered from the server. */
function DashboardSkeleton() {
  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
  const valueClass = 'mt-2 text-2xl font-semibold text-slate-400';
  const labels = ['Current Cash', 'Total Outstanding', 'Overdue Amount', 'Cash Runway'];

  return (
    <div className="flex flex-col gap-6 pb-20 md:pb-0" aria-busy="true">
      <span className="sr-only">Loading dashboard</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {labels.map((label) => (
          <div key={label} className={cardClass}>
            <p className="text-xs text-slate-600">{label}</p>
            <p className={valueClass}>—</p>
          </div>
        ))}
      </div>
      <section className={`flex flex-col gap-4 ${cardClass}`}>
        <h2 className="text-lg font-semibold text-slate-900">Financial Command Center</h2>
        <p className={valueClass}>—</p>
      </section>
      <section className={`flex flex-col gap-4 ${cardClass}`}>
        <h2 className="text-lg font-semibold text-slate-900">Who owes me</h2>
        <p className={valueClass}>—</p>
      </section>
    </div>
  );
}
