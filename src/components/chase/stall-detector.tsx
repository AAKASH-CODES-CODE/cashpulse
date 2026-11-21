'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { counterReply, stallDetect } from '../../lib/intelligence';

export interface StallDetectorProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
}

const DEFAULT_MESSAGE = 'Director is travelling in Dubai, will pay after the meeting next week';
const COPIED_MS = 2000;

const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-400';
const textareaClass =
  'w-full resize-y rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition motion-safe:duration-200 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus-visible:ring-2 focus-visible:ring-emerald-400/60';
const secondaryButtonClass =
  'tap-press cursor-pointer inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:border-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900';

/** Copies text via the async clipboard API, falling back to a hidden textarea. */
async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or insecure context: use the fallback below.
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    area.remove();
  }
  return copied;
}

export function StallDetector({ clientName, invoiceNumber, amount, dueDate }: StallDetectorProps) {
  const uid = useId();
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop the "Copied" reset timer if the component unmounts before it fires.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const { stallRisk, signals } = stallDetect(message);
  const reply = counterReply(clientName, invoiceNumber, amount, dueDate);

  const handleCopy = async () => {
    const ok = await copyText(reply);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setCopied(false);
    }, COPIED_MS);
  };

  const ids = {
    message: `${uid}-message`,
    reply: `${uid}-reply`,
    risk: `${uid}-risk`,
  };

  return (
    <section
      aria-labelledby={`${uid}-title`}
      className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-zinc-100 shadow-xl shadow-black/30 ring-1 ring-white/5 backdrop-blur-xl md:p-6"
    >
      <h2 id={`${uid}-title`} className="text-lg font-semibold text-zinc-50">
        Stall detector
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Paste the client&apos;s WhatsApp reply to check for payment-stalling language.
      </p>

      <div className="mt-4">
        <label htmlFor={ids.message} className={labelClass}>
          Client message
        </label>
        <textarea
          id={ids.message}
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={textareaClass}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span id={ids.risk} className="text-xs font-medium text-zinc-400">
            {stallRisk === 0 ? 'Low risk' : `Stall risk ${stallRisk}%`}
          </span>
        </div>
        <div
          role="progressbar"
          aria-labelledby={ids.risk}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stallRisk}
          className="h-2 w-full overflow-hidden rounded-full bg-white/5"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-[width] motion-safe:duration-500"
            style={{ width: `${stallRisk}%` }}
          />
        </div>
        {signals.length > 0 && (
          <ul aria-label="Matched stalling signals" className="flex flex-wrap gap-1.5 pt-1">
            {signals.map((signal) => (
              <li
                key={signal}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200"
              >
                {signal}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span id={ids.reply} className="text-xs font-medium text-zinc-400">
            Suggested reply
          </span>
          <button type="button" onClick={handleCopy} className={`${secondaryButtonClass} ${copied ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : ''}`}>
            {copied ? (
              <Check className="h-3.5 w-3.5 animate-in zoom-in-50 duration-200" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy suggested reply'}
          </button>
        </div>
        <p
          aria-labelledby={ids.reply}
          className="rounded-xl border border-white/5 bg-zinc-950/50 p-3.5 text-sm leading-relaxed text-zinc-300"
        >
          {reply}
        </p>
      </div>
    </section>
  );
}
