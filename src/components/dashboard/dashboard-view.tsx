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
import { agingBucket, type AgingBucket } from '../../lib/forecast';
import { daysOverdue } from '../../lib/money';
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
import { ExpensesPanel } from './expenses-panel';
import { InvoicesTable, type InvoiceRow } from './invoices-table';
import { KarmaPanel } from './karma-panel';
import { MetricDetailDrawer, type MetricKey } from './metric-detail-drawer';
import { MetricCards } from './metric-cards';
import { SafeToSpendRing } from './safe-to-spend-ring';

const UPI_ID = 'cashpulse@upi';
const SENDER_NAME = 'CashPulse Freelancer';

const PITCH_STEPS: PitchTourStep[] = [
  {
    id: 'overview',
    title: 'Who owes you',
    body: 'This is your cash snapshot: bank balance, total outstanding, overdue amount and projected runway. Tap any card to see the numbers behind it. These four figures show at a glance whether you can cover next month\'s bills.',
  },
  {
    id: 'debt-radar',
    title: 'Debt Radar',
    body: 'Debt Radar lists each client who owes you, the total amount, and how long their oldest invoice has been due. Use Chase on WhatsApp to send a payment reminder in one tap. Chasing the oldest debt first stops cash from quietly slipping away.',
  },
  {
    id: 'forecast',
    title: '90-day runway & what-if',
    body: 'The 90-day chart plots your baseline balance against a what-if curve. Use the simulator to test a late payment or a default and see the exact date the balance could go negative. A warning months early gives you time to act.',
  },
  {
    id: 'recovery',
    title: 'Emergency recovery',
    body: 'Recovery mode batches your overdue accounts and walks you through them one by one. Chase each client, mark payments as received, and optionally offer a 2.5% UPI discount for paying now. A focused batch recovers cash faster than chasing clients at random.',
  },
  {
    id: 'safe-to-spend',
    title: 'Safe-to-spend & karma',
    body: 'Safe-to-spend shows how much you can spend after rent and tax are set aside. Client Karma grades each client\'s payment reliability and suggests a deposit and negotiation script. Spending only the safe amount protects you from running short.',
  },
  {
    id: 'invoices',
    title: 'Invoices, UPI QR and CA export',
    body: 'The invoice ledger lists every invoice with its status, and each one has a UPI QR code that clients can scan to pay. Mark invoices paid, edit them, or export the full ledger as a CSV for your CA. Accurate records keep payments traceable and tax filing simple.',
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
    deleteExpense,
    setPlan,
    resetDemoData,
  } = useCashPulseStore();
  const [activeBucket, setActiveBucket] = useState<AgingBucket | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chaseInvoiceId, setChaseInvoiceId] = useState<string | null>(null);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
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

  const firstOverdue = rows.find(
    (row) => row.paidDate === undefined && daysOverdue(row.dueDate, today) > 0,
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

  const handleExportCa = (): void => {
    const csv = buildCaCsv(state, today);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cashpulse-ca-ledger.csv';
    link.click();
    URL.revokeObjectURL(url);
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

  const handleBottomSelect = (id: string): void => {
    const section = SECTIONS.find((item) => item.id === id);
    if (section !== undefined) setActiveSection(section.id);
  };

  const handleTourStep = (id: string): void => {
    const section = TOUR_STEP_SECTIONS[id];
    if (section !== undefined) setActiveSection(section);
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
      />
      <SectionNav sections={SECTIONS} active={activeSection} onSelect={setActiveSection} />
      <div className="flex flex-col gap-6 pb-20 md:pb-0">
        <PitchTour steps={PITCH_STEPS} onStepChange={handleTourStep} />
        <div id="overview" className={`flex scroll-mt-20 flex-col gap-6 ${sectionClass('overview')}`}>
          <MetricCards state={state} today={today} onSelect={setSelectedMetric} />
          <ActionBanner rows={rows} today={today} onChase={handleChase} />
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
          className={`flex scroll-mt-20 flex-col gap-5 rounded-2xl border border-white/5 bg-zinc-900/60 p-5 md:p-6 ${sectionClass('forecast')}`}
        >
          <div className="flex flex-col gap-1">
            <h2 id="forecast-heading" className="text-lg font-semibold text-zinc-50">
              Financial Command Center
            </h2>
            <p className="text-sm text-zinc-400">Adjust a client or invoice and watch your runway move.</p>
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
              <h2 id="invoices-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Who owes me
              </h2>
              {activeBucket !== null && (
                <button
                  type="button"
                  onClick={() => setActiveBucket(null)}
                  className="tap-press cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-zinc-50 hover:border-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
            <ExpensesPanel expenses={state.expenses} today={today} onDelete={handleDeleteExpense} />
            <ContractorDeferral expenses={state.expenses} />
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

        <BottomNav onSelect={handleBottomSelect} />
        <BackToTop />
      </div>
    </>
  );
}

/** Placeholder shown until the client-only date exists, so no date-dependent number is rendered from the server. */
function DashboardSkeleton() {
  const cardClass =
    'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900';
  const valueClass = 'mt-2 text-2xl font-semibold text-zinc-400 dark:text-zinc-600';
  const labels = ['Current Cash', 'Total Outstanding', 'Overdue Amount', 'Cash Runway'];

  return (
    <div className="flex flex-col gap-6 pb-20 md:pb-0" aria-busy="true">
      <span className="sr-only">Loading dashboard</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {labels.map((label) => (
          <div key={label} className={cardClass}>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className={valueClass}>—</p>
          </div>
        ))}
      </div>
      <section className={`flex flex-col gap-4 ${cardClass}`}>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Financial Command Center</h2>
        <p className={valueClass}>—</p>
      </section>
      <section className={`flex flex-col gap-4 ${cardClass}`}>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Who owes me</h2>
        <p className={valueClass}>—</p>
      </section>
    </div>
  );
}
