'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildForecast,
  cashRunwayDays,
  dangerLevel,
  RUNWAY_HORIZON_DAYS,
  scenarioAlert,
  type DangerLevel,
} from '../../lib/forecast';
import { formatINR } from '../../lib/money';
import type { AppState, Scenario } from '../../lib/types';

const MIN_DELAY = 5;
const MAX_DELAY = 45;
const DEFAULT_DELAY = 20;
const DELAY_PRESETS = [15, 30, 45] as const;
const WARNING_PREFIX = '⚠️';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900';

const TONE_TEXT: Record<DangerLevel, string> = {
  danger: 'text-rose-400',
  warning: 'text-amber-400',
  safe: 'text-emerald-400',
};

function lowestBalance(points: readonly { balance: number }[]): number {
  return points.reduce((min, p) => Math.min(min, p.balance), Number.POSITIVE_INFINITY);
}

interface StatTileProps {
  label: string;
  value: string;
  tone: DangerLevel;
}

function StatTile({ label, value, tone }: StatTileProps) {
  return (
    <div className="cp-grow-x rounded-xl border border-white/5 bg-zinc-950/60 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-base font-semibold ${TONE_TEXT[tone]}`}>{value}</p>
    </div>
  );
}

export interface WhatIfSimulatorProps {
  state: AppState;
  today?: Date;
  /** Controlled scenario: when provided, stats and alert reflect it instead of the internal selection. */
  scenario?: Scenario;
  onScenarioChange?: (scenario: Scenario | undefined) => void;
}

export function WhatIfSimulator({
  state,
  today = new Date(),
  scenario: scenarioProp,
  onScenarioChange,
}: WhatIfSimulatorProps) {
  const [chosenClientId, setChosenClientId] = useState('');
  const [delayDays, setDelayDays] = useState(DEFAULT_DELAY);
  const [chosenInvoiceId, setChosenInvoiceId] = useState('');
  const [defaulted, setDefaulted] = useState(false);
  // True after Reset: no scenario is active until the user changes a control again.
  const [cleared, setCleared] = useState(false);

  const unpaid = useMemo(() => state.invoices.filter((inv) => inv.paidDate === undefined), [state]);

  const clientOptions = useMemo(() => {
    const withUnpaid = new Set(unpaid.map((inv) => inv.clientId));
    return state.clients.filter((c) => withUnpaid.has(c.id));
  }, [state, unpaid]);

  // Derived selections: the first client is the default; '' means "None" for the invoice.
  const clientId = clientOptions.some((c) => c.id === chosenClientId)
    ? chosenClientId
    : (clientOptions[0]?.id ?? '');
  const invoiceId = unpaid.some((inv) => inv.id === chosenInvoiceId) ? chosenInvoiceId : '';
  const toggleActive = invoiceId !== '' && defaulted;

  const scenario = useMemo<Scenario | undefined>(() => {
    if (cleared || clientId === '') return undefined;
    // A defaulted invoice is excluded. Only the invoice is targeted here: pairing it with
    // clientId would also exclude every other invoice of that client.
    if (toggleActive) {
      return { invoiceId, delayDays, defaulted: true };
    }
    return { clientId, delayDays, defaulted: false };
  }, [cleared, clientId, invoiceId, toggleActive, delayDays]);

  useEffect(() => {
    onScenarioChange?.(scenario);
  }, [scenario, onScenarioChange]);

  const baselinePoints = useMemo(
    () => buildForecast(state, RUNWAY_HORIZON_DAYS, undefined, today),
    [state, today],
  );
  const activeScenario = scenarioProp ?? scenario;
  const scenarioPoints = useMemo(
    () => buildForecast(state, RUNWAY_HORIZON_DAYS, activeScenario, today),
    [state, activeScenario, today],
  );

  const baselineMin = lowestBalance(baselinePoints);
  const scenarioMin = lowestBalance(scenarioPoints);
  const baselineRunway = cashRunwayDays(state, today);
  const scenarioBreach = scenarioPoints.findIndex((p) => p.balance < 0);
  const scenarioRunway = scenarioBreach === -1 ? RUNWAY_HORIZON_DAYS : scenarioBreach;

  const alert = activeScenario ? scenarioAlert(state, activeScenario, today) : null;
  const isWarning = alert !== null && alert.startsWith(WARNING_PREFIX);

  const handleReset = (): void => {
    setChosenClientId('');
    setDelayDays(DEFAULT_DELAY);
    setChosenInvoiceId('');
    setDefaulted(false);
    setCleared(true);
    onScenarioChange?.(undefined);
  };

  return (
    <section aria-labelledby="what-if-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 id="what-if-heading" className="text-base font-semibold text-zinc-100">
          What-If Scenarios
        </h3>
        <p className="text-sm text-zinc-400">
          Test a late payment or a default and watch your runway respond.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="cp-animate-in flex flex-col gap-3 rounded-xl border border-white/5 bg-zinc-950/60 p-4">
          <label htmlFor="what-if-client" className="text-sm font-medium text-zinc-200">
            What if this client pays late
          </label>
          <select
            id="what-if-client"
            value={clientId}
            onChange={(e) => {
              setChosenClientId(e.target.value);
              setCleared(false);
            }}
            disabled={clientOptions.length === 0}
            className={`rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ${FOCUS_RING}`}
          >
            {clientOptions.length === 0 && <option value="">No unpaid invoices</option>}
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label htmlFor="what-if-delay" className="text-sm text-zinc-300">
            <span className="font-semibold text-emerald-400">{delayDays} days late</span>
          </label>
          <input
            id="what-if-delay"
            type="range"
            min={MIN_DELAY}
            max={MAX_DELAY}
            step={1}
            value={delayDays}
            onChange={(e) => {
              setDelayDays(Number(e.target.value));
              setCleared(false);
            }}
            className={`w-full cursor-pointer accent-emerald-500 rounded-lg ${FOCUS_RING}`}
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Delay presets">
            {DELAY_PRESETS.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={delayDays === days}
                onClick={() => {
                  setDelayDays(days);
                  setCleared(false);
                }}
                className={`tap-press cursor-pointer rounded-lg border px-3 py-1 text-xs font-medium active:scale-95 ${
                  delayDays === days
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10'
                    : 'border-white/10 text-zinc-300 hover:bg-zinc-800/60 hover:border-white/20'
                } ${FOCUS_RING}`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div
          className="cp-animate-in flex flex-col gap-3 rounded-xl border border-white/5 bg-zinc-950/60 p-4"
          style={{ animationDelay: '60ms' }}
        >
          <label htmlFor="what-if-invoice" className="text-sm font-medium text-zinc-200">
            What if this invoice defaults or doesn&apos;t pay
          </label>
          <select
            id="what-if-invoice"
            value={invoiceId}
            onChange={(e) => {
              setChosenInvoiceId(e.target.value);
              // A default flag belongs to one invoice; never carry it over to another.
              setDefaulted(false);
              setCleared(false);
            }}
            className={`rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ${FOCUS_RING}`}
          >
            <option value="">None</option>
            {unpaid.map((inv) => {
              const client = state.clients.find((c) => c.id === inv.clientId);
              return (
                <option key={inv.id} value={inv.id}>
                  {`${inv.number} · ${client?.name ?? 'Unknown client'} · ${formatINR(inv.amount)}`}
                </option>
              );
            })}
          </select>
          <div className="flex items-center justify-between gap-3">
            <span id="what-if-toggle-label" className="text-sm text-zinc-300">
              Assume this invoice defaults
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={toggleActive}
              aria-labelledby="what-if-toggle-label"
              disabled={invoiceId === ''}
              onClick={() => {
                setDefaulted((v) => !v);
                setCleared(false);
              }}
              className={`tap-press cursor-pointer relative inline-flex h-6 w-11 shrink-0 items-center rounded-full active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                toggleActive ? 'bg-rose-500 shadow-sm shadow-rose-500/30' : 'bg-zinc-700'
              } ${FOCUS_RING}`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
                  toggleActive ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Lowest balance (baseline)" value={formatINR(baselineMin)} tone={dangerLevel(baselineMin)} />
        <StatTile label="Lowest balance (scenario)" value={formatINR(scenarioMin)} tone={dangerLevel(scenarioMin)} />
        <StatTile
          label="Runway (baseline)"
          value={`${baselineRunway} days`}
          tone={baselineRunway < RUNWAY_HORIZON_DAYS ? 'danger' : 'safe'}
        />
        <StatTile
          label="Runway (scenario)"
          value={`${scenarioRunway} days`}
          tone={scenarioRunway < RUNWAY_HORIZON_DAYS ? 'danger' : 'safe'}
        />
      </div>

      {alert !== null && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm font-medium ${
            isWarning
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {alert}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className={`tap-press cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-white/20 active:scale-95 ${FOCUS_RING}`}
        >
          Reset scenario
        </button>
      </div>
    </section>
  );
}
