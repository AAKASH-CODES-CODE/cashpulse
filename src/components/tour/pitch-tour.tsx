'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PitchTourStep {
  id: string;
  title: string;
  body: string;
}

export interface PitchTourProps {
  steps: PitchTourStep[];
  onStepChange?: (id: string) => void;
}

const TOUR_KEY = 'p';
const STEP_DURATION_MS = 9000;
const AUTO_START_DELAY_MS = 800;

export function PitchTour({ steps, onStepChange }: PitchTourProps) {
  const count = steps.length;
  // null = tour inactive; otherwise the zero-based index of the current step.
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);

  const handleStart = useCallback(() => {
    if (count === 0) return;
    setPlaying(true);
    setIndex((prev) => prev ?? 0);
  }, [count]);

  const handleNext = useCallback(() => {
    setIndex((prev) => (prev === null ? prev : Math.min(prev + 1, count - 1)));
  }, [count]);

  const handleBack = useCallback(() => {
    setIndex((prev) => (prev === null ? prev : Math.max(prev - 1, 0)));
  }, []);

  const handleExit = useCallback(() => {
    setIndex(null);
  }, []);

  const handlePlayPause = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  // Auto-start on every page load. The timer runs from an effect and is cleared on unmount.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      handleStart();
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [handleStart]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() !== TOUR_KEY) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }
      if (count === 0) return;
      setPlaying(true);
      setIndex((prev) => (prev === null ? 0 : null));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count]);

  // Auto-advance: one timer per step while playing. Cleanup clears it on pause, step change or exit.
  useEffect(() => {
    if (index === null || !playing || count === 0) return;
    const timer = window.setTimeout(() => {
      setIndex((prev) => (prev === null || prev >= count - 1 ? null : prev + 1));
    }, STEP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [index, playing, count]);

  const step = index === null ? undefined : steps[index];
  const stepId = step?.id ?? null;

  // Keep the latest callback without making the step effect re-run on every parent render.
  const onStepChangeRef = useRef(onStepChange);
  useEffect(() => {
    onStepChangeRef.current = onStepChange;
  }, [onStepChange]);

  // Forward the step change and scroll the step's section into view.
  useEffect(() => {
    if (stepId === null) return;
    onStepChangeRef.current?.(stepId);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(stepId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stepId]);

  return (
    <>
      <button
        type="button"
        onClick={handleStart}
        className="tap-bounce group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:animate-pulse"
      >
        Start 60-second pitch tour
        <kbd className="rounded-md border border-white/40 bg-white/20 px-1.5 py-0.5 font-mono text-[11px] text-white">
          P
        </kbd>
      </button>

      {index !== null && step !== undefined && (
        <>
          <div
            key={`drop-${index}`}
            aria-hidden="true"
            className="cp-tour-fade pointer-events-none fixed inset-0 z-40 overflow-hidden"
          >
            <span className="cp-drop-ripple-el absolute left-1/2 top-1/2 h-[150vmin] w-[150vmin] rounded-full border-2 border-emerald-500/70 bg-emerald-500/10" />
          </div>

          <div
            key={`caption-${index}`}
            role="dialog"
            aria-label="Pitch tour"
            aria-live="polite"
            className="spring-dialog cp-caption-enter fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 p-5 text-slate-900 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5 backdrop-blur-xl md:inset-x-auto md:bottom-6 md:right-6 md:mx-0 md:w-96"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-emerald-700">
                Step {index + 1} of {count}
              </p>
              <button
                type="button"
                onClick={handleExit}
                className="tap-press cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              >
                Skip tour
              </button>
            </div>
            <h3 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>

            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div
                className="cp-tour-progress h-full rounded-full bg-emerald-600"
                style={{
                  animationDuration: `${STEP_DURATION_MS}ms`,
                  animationPlayState: playing ? 'running' : 'paused',
                }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleExit}
                aria-label="Exit pitch tour"
                className="tap-press cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              >
                Exit
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={index === 0}
                  aria-label="Back to previous step"
                  className="tap-press cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handlePlayPause}
                  aria-label={playing ? 'Pause tour' : 'Play tour'}
                  className="tap-press cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                >
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={index >= count - 1}
                  aria-label="Next step"
                  className="tap-bounce cursor-pointer rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:from-emerald-400 hover:to-emerald-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
