'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Pause,
  CheckCircle2,
  Compass,
  Zap,
  Hand,
} from 'lucide-react';

export interface PitchTourStep {
  id: string;
  targetId: string;
  title: string;
  category: string;
  categoryColor?: string;
  body: string;
  highlights?: string[];
  section?: 'overview' | 'debt' | 'forecast' | 'recovery' | 'invoices' | 'tools';
  isTapStep?: boolean;
  tapActionLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface PitchTourProps {
  steps: PitchTourStep[];
  currentSection: string;
  onSelectSection: (section: 'overview' | 'debt' | 'forecast' | 'recovery' | 'invoices' | 'tools') => void;
  onTriggerAction?: (actionKey: string) => void;
}

const TOUR_KEY = 'p';
const STEP_DURATION_MS = 12000;

interface RectState {
  top: number;
  left: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

export function PitchTour({
  steps,
  currentSection,
  onSelectSection,
  onTriggerAction,
}: PitchTourProps) {
  const count = steps.length;
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rect, setRect] = useState<RectState | null>(null);
  const [popoverPlacement, setPopoverPlacement] = useState<'bottom' | 'top' | 'floating'>('bottom');
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeStep = index === null ? null : steps[index];

  // Helper to calculate target element bounding rect & center
  const updateSpotlight = useCallback(() => {
    if (!activeStep) {
      setRect(null);
      return;
    }

    const el = document.getElementById(activeStep.targetId);
    if (!el) {
      setRect(null);
      return;
    }

    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      setRect(null);
      return;
    }

    const top = Math.max(0, r.top);
    const left = Math.max(0, r.left);
    const width = r.width;
    const height = r.height;

    setRect({
      top,
      left,
      width,
      height,
      cx: left + width / 2,
      cy: top + height / 2,
    });

    // Smart placement detection
    const spaceBelow = window.innerHeight - (top + height);
    const spaceAbove = top;
    const estimatedCardHeight = 310;

    if (spaceBelow >= estimatedCardHeight + 20) {
      setPopoverPlacement('bottom');
    } else if (spaceAbove >= estimatedCardHeight + 20) {
      setPopoverPlacement('top');
    } else {
      setPopoverPlacement('floating');
    }
  }, [activeStep]);

  // Keep target in sync on scroll or window resize
  useEffect(() => {
    if (index === null) return;
    const handleScrollOrResize = () => {
      window.requestAnimationFrame(updateSpotlight);
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [index, updateSpotlight]);

  const handleStart = useCallback(() => {
    if (count === 0) return;
    setPlaying(false);
    setIndex(0);
  }, [count]);

  // Auto-start automatically whenever the website loads
  useEffect(() => {
    const timer = window.setTimeout(() => {
      handleStart();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [handleStart]);

  const handleNext = useCallback(() => {
    setIndex((prev) => (prev === null ? null : Math.min(prev + 1, count - 1)));
  }, [count]);

  const handleBack = useCallback(() => {
    setIndex((prev) => (prev === null ? null : Math.max(prev - 1, 0)));
  }, []);

  const handleExit = useCallback(() => {
    setIndex(null);
    setPlaying(false);
    setRect(null);
  }, []);

  const handlePlayPause = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  // Handle Tab Tap or Action Tap
  const handlePerformTap = useCallback(() => {
    if (!activeStep) return;

    if (activeStep.section && activeStep.isTapStep) {
      onSelectSection(activeStep.section);
    }

    if (activeStep.onAction) {
      activeStep.onAction();
    } else if (onTriggerAction) {
      onTriggerAction(activeStep.id);
    }

    setTimeout(() => {
      handleNext();
    }, 250);
  }, [activeStep, onSelectSection, onTriggerAction, handleNext]);

  // Keyboard shortcut listener
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }

      if (event.key.toLowerCase() === TOUR_KEY && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (index === null) handleStart();
        else handleExit();
      } else if (index !== null) {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          handleNext();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          handleBack();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          handleExit();
        } else if (event.key === ' ') {
          event.preventDefault();
          handlePlayPause();
        } else if (event.key === 'Enter' && activeStep?.isTapStep) {
          event.preventDefault();
          handlePerformTap();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, activeStep, handleStart, handleNext, handleBack, handleExit, handlePlayPause, handlePerformTap]);

  // Handle active step transition: ensure section is rendered, scroll smoothly, and update focus
  useEffect(() => {
    if (index === null || !activeStep) return;

    if (activeStep.section && !activeStep.isTapStep && activeStep.section !== currentSection) {
      onSelectSection(activeStep.section);
    }

    const timer = window.setTimeout(() => {
      const el = document.getElementById(activeStep.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const interval = window.setInterval(updateSpotlight, 50);
        window.setTimeout(() => window.clearInterval(interval), 400);
      } else {
        updateSpotlight();
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [index, activeStep, currentSection, onSelectSection, updateSpotlight]);

  // Auto-advance timer when playing
  useEffect(() => {
    if (index === null || !playing || count === 0) return;
    const timer = window.setTimeout(() => {
      setIndex((prev) => (prev === null || prev >= count - 1 ? null : prev + 1));
    }, STEP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [index, playing, count]);

  return (
    <>
      {/* Tour Launch Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 p-3.5 sm:p-4 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <Compass className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Interactive Guided Tour (60s Walkthrough)
              </h3>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                18 Interactive Steps
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Soft ambient focus with step-by-step interactive walkthrough for every feature.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="tap-bounce group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
          <span>Start Guided Tour</span>
          <kbd className="rounded border border-white/40 bg-white/20 px-1 py-0.5 font-mono text-[10px] text-white">
            P
          </kbd>
        </button>
      </div>

      {/* Seamless Radial Vignette Layer (Zero harsh borders, zero box, corners gradually darken smoothly) */}
      {index !== null && activeStep && (
        <div className="fixed inset-0 z-50 pointer-events-none animate-in fade-in duration-300">
          {/* Smooth radial gradient falloff - center is 100% clear & bright, corners softly darken */}
          <div
            style={{
              background: rect
                ? `radial-gradient(ellipse ${Math.max(rect.width * 0.9, 360)}px ${Math.max(
                    rect.height * 0.9,
                    240
                  )}px at ${rect.cx}px ${rect.cy}px, rgba(2, 6, 23, 0) 0%, rgba(2, 6, 23, 0) 35%, rgba(2, 6, 23, 0.28) 60%, rgba(2, 6, 23, 0.62) 82%, rgba(2, 6, 23, 0.82) 100%)`
                : 'radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0) 0%, rgba(2, 6, 23, 0.75) 100%)',
            }}
            className="fixed inset-0 transition-all duration-500 ease-out backdrop-blur-[1.5px]"
          />

          {/* Contextual Popover Card positioned cleanly adjacent to the focused element */}
          <div
            ref={popoverRef}
            style={
              rect
                ? {
                    position: 'fixed',
                    top:
                      popoverPlacement === 'bottom'
                        ? `${Math.min(window.innerHeight - 340, rect.top + rect.height + 12)}px`
                        : popoverPlacement === 'top'
                        ? `${Math.max(16, rect.top - 320)}px`
                        : 'auto',
                    bottom: popoverPlacement === 'floating' ? '20px' : 'auto',
                    left:
                      typeof window !== 'undefined' && window.innerWidth < 640
                        ? '16px'
                        : `${Math.max(
                            16,
                            Math.min(window.innerWidth - 440, rect.left + rect.width / 2 - 210)
                          )}px`,
                    right: typeof window !== 'undefined' && window.innerWidth < 640 ? '16px' : 'auto',
                  }
                : {
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                  }
            }
            className="pointer-events-auto z-50 w-full sm:max-w-[420px] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 text-slate-950 dark:text-white shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    activeStep.categoryColor || 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {activeStep.category}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Step {index + 1} of {count}
                </span>
              </div>
              <button
                type="button"
                onClick={handleExit}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 cursor-pointer transition"
                title="Exit Tour (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="mt-3">
              <h4 className="text-base font-extrabold text-slate-950 dark:text-white leading-snug">
                {activeStep.title}
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {activeStep.body}
              </p>

              {/* Highlights */}
              {activeStep.highlights && activeStep.highlights.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeStep.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{h}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Tap to Explore / Interactive Action Button */}
              {(activeStep.isTapStep || activeStep.actionLabel) && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Hand className="h-3.5 w-3.5 animate-bounce" />
                    <span>Interactive Tap</span>
                  </span>

                  <button
                    type="button"
                    onClick={handlePerformTap}
                    className="tap-bounce inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>{activeStep.tapActionLabel || activeStep.actionLabel || 'Tap to Open'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Timer Progress */}
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="cp-tour-progress h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                style={{
                  animationDuration: `${STEP_DURATION_MS}ms`,
                  animationPlayState: playing ? 'running' : 'paused',
                }}
              />
            </div>

            {/* Navigation footer */}
            <div className="mt-4 flex items-center justify-between gap-2 text-xs">
              {/* Dots */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-[140px] py-1">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`h-1.5 shrink-0 rounded-full transition-all cursor-pointer ${
                      i === index
                        ? 'w-4 bg-emerald-600'
                        : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                    }`}
                    title={`Jump to step ${i + 1}`}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title={playing ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  disabled={index === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={index >= count - 1 ? handleExit : handleNext}
                  className="tap-bounce inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white shadow hover:bg-emerald-500 cursor-pointer"
                >
                  <span>{index >= count - 1 ? 'Finish' : 'Next'}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
