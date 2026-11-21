'use client';

import { useEffect, useId } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import type { Plan } from '../../lib/types';

export interface PricingModalProps {
  open: boolean;
  currentPlan: Plan;
  onClose: () => void;
  onChoosePlan: (plan: Plan) => void;
}

interface PlanDefinition {
  id: Plan;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlighted: boolean;
}

const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free Starter',
    price: '₹0',
    tagline: 'Get organised and see where your money stands.',
    features: [
      'Up to 3 invoices per month',
      'Basic cash tracking',
      'Bills & expenses list',
      'Chase messages (basic)',
    ],
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹499',
    tagline: 'Predict cash runway and get paid faster.',
    features: [
      'Unlimited invoices',
      'Automated WhatsApp chase templates (all 3 tones)',
      '90-day predictive runway',
      'What-If scenario simulator',
      'Priority support',
    ],
    highlighted: true,
  },
];

export function PricingModal(props: PricingModalProps) {
  const { open, currentPlan, onClose, onChoosePlan } = props;
  const uid = useId();
  const titleId = `${uid}-title`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="spring-dialog relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-900/90 p-5 text-zinc-100 shadow-2xl shadow-black/50 ring-1 ring-white/5 backdrop-blur-xl md:rounded-2xl md:p-8 md:max-w-3xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Pricing</p>
            <h2 id={titleId} className="mt-1 text-lg font-semibold text-zinc-50 md:text-2xl">
              Simple pricing for a one-person back office
            </h2>
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const buttonLabel = isCurrent
              ? 'Current plan'
              : plan.id === 'pro'
                ? 'Upgrade to Pro'
                : 'Switch to Free';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-transform duration-200 hover:-translate-y-1 ${
                  plan.highlighted
                    ? 'border-emerald-500/30 bg-zinc-950/60 shadow-lg shadow-emerald-500/10'
                    : 'border-white/5 bg-zinc-900/60 hover:border-white/15'
                }`}
              >
                {plan.highlighted && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent"
                  />
                )}
                {plan.highlighted && (
                  <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Most popular
                  </span>
                )}

                <h3 className="relative text-lg font-semibold text-zinc-50">{plan.name}</h3>
                <p className="relative mt-1 text-sm text-zinc-400">{plan.tagline}</p>

                <p className="relative mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tabular-nums text-zinc-50">{plan.price}</span>
                  <span className="text-sm text-zinc-500">/mo</span>
                </p>

                <ul className="relative mt-5 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? 'text-emerald-400' : 'text-zinc-500'}`}
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => onChoosePlan(plan.id)}
                  className={`tap-bounce cursor-pointer relative mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${
                    plan.highlighted
                      ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-zinc-950 shadow-lg shadow-emerald-900/30 hover:brightness-110'
                      : 'border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {buttonLabel}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Demo mode: upgrading is simulated and stored only in this browser.
        </p>
      </div>
    </div>
  );
}
