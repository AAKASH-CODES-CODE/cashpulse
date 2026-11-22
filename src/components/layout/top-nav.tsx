'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import {
  Download,
  EllipsisVertical,
  Plus,
  RotateCcw,
  Wallet,
  Sun,
  Moon,
  Terminal,
  AlertTriangle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import type { Plan, BusinessPersona } from '../../lib/types';
import { PERSONA_LIST } from '../../lib/personas';

export interface TopNavProps {
  onNewInvoice: () => void;
  onReset: () => void;
  plan: Plan;
  onOpenPricing: () => void;
  onExportCa?: () => void;
  currentPersona?: BusinessPersona;
  onSwitchPersona?: (persona: BusinessPersona) => void;
  onOpenApiConsole?: () => void;
  onOpenBadDayProtocol?: () => void;
  onOpenQuickPaste?: () => void;
}

export function TopNav({
  onNewInvoice,
  onReset,
  plan,
  onOpenPricing,
  onExportCa,
  currentPersona = 'designer',
  onSwitchPersona,
  onOpenApiConsole,
  onOpenBadDayProtocol,
  onOpenQuickPaste,
}: TopNavProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkCurrent = document.documentElement.classList.contains('dark');
    if (isDarkCurrent) {
      requestAnimationFrame(() => {
        setIsDark(true);
      });
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cashpulse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cashpulse_theme', 'light');
    }
  };

  const planLabel = plan === 'pro' ? 'Pro' : 'Free plan';
  const currentMeta = PERSONA_LIST.find((p) => p.id === currentPersona) || PERSONA_LIST[0];

  /** Runs a menu action, then closes the enclosing "More actions" menu. */
  const runMenuAction = (event: MouseEvent<HTMLButtonElement>, action: () => void): void => {
    event.currentTarget.closest('details')?.removeAttribute('open');
    action();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xs transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2.5 px-3.5 py-2.5 sm:px-6">
        {/* Brand & Persona Switcher */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-transform duration-200 ease-out hover:rotate-6 hover:scale-105">
            <Wallet className="h-4.5 w-4.5" aria-hidden="true" />
          </span>

          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">CashPulse</span>
            <span className="hidden truncate text-xs font-medium text-slate-500 dark:text-slate-400 lg:block">
              The One-Person Back Office
            </span>
          </div>

          {/* Persona selector dropdown */}
          {onSwitchPersona && (
            <div id="top-nav-persona" className="relative ml-1 sm:ml-2">
              <details className="group relative">
                <summary className="tap-press list-none inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition select-none [&::-webkit-details-marker]:hidden">
                  <span>{currentMeta.badge}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-xl shadow-slate-950/10 dark:shadow-black/40">
                  <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Switch Business Persona
                  </div>
                  {PERSONA_LIST.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={(e) => {
                        runMenuAction(e, () => onSwitchPersona(p.id));
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left text-xs transition cursor-pointer ${
                        p.id === currentPersona
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-base leading-none">{p.badge.split(' ')[0]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{p.title}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{p.tagline}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Quick AI WhatsApp Chat Paste button */}
          {onOpenQuickPaste && (
            <button
              id="quick-paste-trigger"
              type="button"
              onClick={onOpenQuickPaste}
              title="Paste WhatsApp chat message to generate invoice instantly"
              className="tap-press inline-flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">AI Quick Paste</span>
            </button>
          )}

          {/* Bad Day Protocol Emergency Button */}
          {onOpenBadDayProtocol && (
            <button
              id="bad-day-protocol-trigger"
              type="button"
              onClick={onOpenBadDayProtocol}
              title="Emergency Bad Day Protocol (Triage 5+ late clients at once)"
              className="tap-press inline-flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 px-2.5 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden md:inline">Bad Day Protocol</span>
            </button>
          )}

          {/* Developer API Console trigger */}
          {onOpenApiConsole && (
            <button
              id="api-console-trigger"
              type="button"
              onClick={onOpenApiConsole}
              title="Open Live REST & UPI Webhook API Explorer"
              className="tap-press inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition"
            >
              <Terminal className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden sm:inline">API Console</span>
            </button>
          )}

          {/* High-Contrast Light / Linear Dark Theme Switcher */}
          <button
            id="theme-toggle-trigger"
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light/dark theme"
            title={isDark ? 'Switch to High-Contrast Light Mode' : 'Switch to Linear Dark Mode'}
            className="tap-press flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition shadow-xs"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

          {/* Plan badge */}
          <button
            type="button"
            onClick={onOpenPricing}
            className={`tap-press focus-ring-accent rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer ${
              plan === 'pro'
                ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {planLabel}
          </button>

          {/* More menu */}
          <details className="relative">
            <summary
              aria-label="More actions"
              title="More actions"
              className="tap-press cp-focus flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 [&::-webkit-details-marker]:hidden"
            >
              <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-1.5 flex w-56 flex-col gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-xl shadow-slate-950/15 backdrop-blur">
              {onExportCa && (
                <button
                  type="button"
                  onClick={(event) => runMenuAction(event, onExportCa)}
                  className="tap-press cp-focus flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Download CA Ledger (CSV)</span>
                </button>
              )}
              <a
                href="/api/health"
                target="_blank"
                rel="noreferrer"
                className="tap-press cp-focus flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Terminal className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>API Health Endpoint (JSON)</span>
              </a>
              <button
                type="button"
                onClick={(event) => runMenuAction(event, onReset)}
                className="tap-press cp-focus flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>Reset Demo State</span>
              </button>
            </div>
          </details>

          {/* New Invoice Button */}
          <button
            id="new-invoice-btn"
            type="button"
            onClick={onNewInvoice}
            className="tap-bounce focus-ring-accent group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-400 hover:to-emerald-500 cursor-pointer"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 ease-out group-hover:rotate-90" aria-hidden="true" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>
    </header>
  );
}
