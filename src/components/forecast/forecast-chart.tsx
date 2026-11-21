'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BUFFER_INR,
  buildForecast,
  dangerLevel,
  type DangerLevel,
  type ForecastPoint,
} from '../../lib/forecast';
import { formatDate, formatINR } from '../../lib/money';
import type { AppState, Scenario } from '../../lib/types';

const HORIZONS = [30, 60, 90] as const;
type Horizon = (typeof HORIZONS)[number];

const COLORS: Record<DangerLevel, string> = {
  danger: '#f43f5e',
  warning: '#f59e0b',
  safe: '#10b981',
};

const STATUS_PILL: Record<DangerLevel, string> = {
  danger: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30',
  warning: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30',
  safe: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30',
};

const BASELINE_COLOR = '#60a5fa';

interface ChartPoint extends ForecastPoint {
  baseline: number;
}

interface TooltipPayloadItem {
  payload?: ForecastPoint;
}

interface ForecastTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
}

function ForecastTooltip({ active, payload }: ForecastTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-zinc-200">{formatDate(point.date)}</p>
      <p className="mt-1 text-zinc-300">
        Balance: <span className="font-semibold text-white">{formatINR(point.balance)}</span>
      </p>
      <p className="text-emerald-400">Inflow: {formatINR(point.inflow)}</p>
      <p className="text-rose-400">Outflow: {formatINR(point.outflow)}</p>
    </div>
  );
}

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCE_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCE_MOTION_QUERY).matches;
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getServerReducedMotionSnapshot);
}

export interface ForecastChartProps {
  state: AppState;
  scenario?: Scenario;
  today?: Date;
}

export function ForecastChart({ state, scenario, today = new Date() }: ForecastChartProps) {
  const [horizon, setHorizon] = useState<Horizon>(90);
  const reduceMotion = usePrefersReducedMotion();
  const points = buildForecast(state, horizon, scenario, today);
  const baselinePoints = scenario ? buildForecast(state, horizon, undefined, today) : null;
  const chartData: ChartPoint[] = points.map((p, i) => ({
    ...p,
    baseline: baselinePoints?.[i]?.balance ?? p.balance,
  }));

  const minBalance = points.reduce((min, p) => Math.min(min, p.balance), Number.POSITIVE_INFINITY);
  const level = dangerLevel(minBalance);
  const color = COLORS[level];

  const breachPoint =
    level === 'danger'
      ? points.find((p) => p.balance < 0)
      : level === 'warning'
        ? points.find((p) => p.balance < BUFFER_INR)
        : undefined;
  const breachDate = breachPoint ? formatDate(breachPoint.date) : '';

  const scenarioDeficit = points.find((p) => p.balance < 0);
  const baselineDeficit = baselinePoints?.find((p) => p.balance < 0);

  return (
    <div className="cp-animate-in flex flex-col gap-4 rounded-2xl border border-white/5 bg-zinc-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-100">Cash runway</h3>
        <div
          role="group"
          aria-label="Forecast horizon"
          className="inline-flex rounded-xl bg-zinc-800/60 p-1"
        >
          {HORIZONS.map((days) => {
            const active = horizon === days;
            return (
              <button
                key={days}
                type="button"
                aria-pressed={active}
                onClick={() => setHorizon(days)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {days} days
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            key={`${horizon}-${reduceMotion ? 'reduced' : 'motion'}`}
            data={chartData}
            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: '#71717a', fontSize: 12 }}
              stroke="rgba(255,255,255,0.08)"
              minTickGap={24}
            />
            <YAxis
              tickFormatter={formatINR}
              tick={{ fill: '#71717a', fontSize: 12 }}
              stroke="rgba(255,255,255,0.08)"
              width={96}
            />
            <Tooltip content={ForecastTooltip} />
            {scenario ? (
              <Legend verticalAlign="top" align="right" height={28} wrapperStyle={{ fontSize: 12 }} />
            ) : null}
            <ReferenceLine y={0} stroke="#fb7185" strokeWidth={1.5} strokeDasharray="6 4" />
            <ReferenceLine
              y={BUFFER_INR}
              stroke="#fbbf24"
              strokeDasharray="6 4"
              label={{
                value: `Safety floor ${formatINR(BUFFER_INR)}`,
                position: 'insideTopRight',
                fill: '#fbbf24',
                fontSize: 11,
              }}
            />
            {baselinePoints ? (
              <Area
                type="monotone"
                dataKey="baseline"
                name="Baseline"
                stroke={BASELINE_COLOR}
                strokeWidth={2}
                fill="none"
                isAnimationActive={!reduceMotion}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="balance"
              name={scenario ? 'What-If' : 'Balance'}
              stroke={color}
              strokeWidth={2}
              fill="url(#forecastFill)"
              isAnimationActive={!reduceMotion}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            {baselineDeficit ? (
              <ReferenceDot
                x={baselineDeficit.date}
                y={baselineDeficit.balance}
                r={5}
                fill={BASELINE_COLOR}
                stroke="none"
                label={{
                  value: `Deficit · ${formatDate(baselineDeficit.date)}`,
                  position: 'top',
                  fill: BASELINE_COLOR,
                  fontSize: 11,
                }}
              />
            ) : null}
            {scenarioDeficit ? (
              <ReferenceDot
                x={scenarioDeficit.date}
                y={scenarioDeficit.balance}
                r={5}
                fill={color}
                stroke="none"
                label={{
                  value: `Deficit · ${formatDate(scenarioDeficit.date)}`,
                  position: 'bottom',
                  fill: color,
                  fontSize: 11,
                }}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p
        title="Minimum Operating Safety Floor"
        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_PILL[level]}`}
      >
        {level === 'danger' && `Danger Zone: cash drops below ₹0 on ${breachDate}`}
        {level === 'warning' && `Below ${formatINR(BUFFER_INR)} buffer on ${breachDate}`}
        {level === 'safe' && 'Healthy runway'}
      </p>
    </div>
  );
}
