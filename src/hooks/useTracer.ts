import { useState, useEffect, useRef, useCallback } from 'react';

export type TraceType =
  | 'default'
  | 'hook'
  | 'handler'
  | 'state-change'
  | 'effect'
  | 'cleanup'
  | 'jsx';

export interface TraceStep {
  lines: string[];
  type?: TraceType;
  /** Milliseconds to hold this step before auto-advancing. Default: 5000. */
  duration?: number;
  /** Annotation text shown in the footer bar while this step is active. */
  annotation?: string;
}

export interface TracerState {
  activeLines: string[];
  currentStep: number;
  currentType: TraceType;
  currentAnnotation: string | undefined;
  isPlaying: boolean;
  isDone: boolean;
  totalSteps: number;
  trigger: () => void;
  reset: () => void;
}

/**
 * Drives the animated code-trace highlight sequence.
 *
 * Call `trigger()` to start from step 0 and auto-advance through every step.
 * Call `reset()` to clear all highlights.
 * `activeLines` tells CodeTrace which line IDs to illuminate right now.
 */
export function useTracer(
  steps: TraceStep[],
  options?: { stepDuration?: number },
): TracerState {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const defaultDuration = options?.stepDuration ?? 5000;

  /** Start the trace from step 0. Cancels any in-progress trace. */
  const trigger = useCallback(() => {
    clearTimeout(timerRef.current);
    setCurrentStep(0);
    setIsPlaying(true);
  }, []);

  /** Clear all highlights and stop the trace. */
  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    setCurrentStep(-1);
    setIsPlaying(false);
  }, []);

  // Auto-advance: schedule the next step after the current step's duration
  useEffect(() => {
    if (!isPlaying || currentStep < 0) return;
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const duration = steps[currentStep]?.duration ?? defaultDuration;
    timerRef.current = window.setTimeout(() => {
      setCurrentStep(s => s + 1);
    }, duration);
    return () => clearTimeout(timerRef.current);
  }, [isPlaying, currentStep, steps, defaultDuration]);

  const activeLines: string[] =
    currentStep >= 0 && currentStep < steps.length
      ? steps[currentStep].lines
      : [];

  const currentType: TraceType =
    (currentStep >= 0 ? steps[currentStep]?.type : undefined) ?? 'default';

  const currentAnnotation: string | undefined =
    currentStep >= 0 ? steps[currentStep]?.annotation : undefined;

  return {
    activeLines,
    currentStep,
    currentType,
    currentAnnotation,
    isPlaying,
    isDone: currentStep >= steps.length - 1 && !isPlaying && currentStep >= 0,
    totalSteps: steps.length,
    trigger,
    reset,
  };
}
