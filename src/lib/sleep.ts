import type { SleepTimer } from '@/types';

/** Volume for the last `fadeMs` of a sleep timer: fades linearly from 1 down to 0. */
export function sleepVolume(remainingMs: number, fadeMs = 10_000): number {
  return Math.min(1, Math.max(0, remainingMs / fadeMs));
}

/**
 * Time left on a minutes timer. `endsAt` is null while playback is paused; `remainingMs` is the time
 * that was left when the timer last (re)started, so it also caps a `now` that is slightly stale.
 */
export function sleepRemainingMs(timer: Extract<SleepTimer, { kind: 'minutes' }>, now: number): number {
  return timer.endsAt === null
    ? timer.remainingMs
    : Math.min(timer.remainingMs, Math.max(0, timer.endsAt - now));
}

/** Short label for the sleep button: `23m`, `0:45` or `End of chapter`. */
export function sleepLabel(timer: SleepTimer, now: number): string {
  if (timer.kind === 'chapter') {
    return 'End of chapter';
  }
  const seconds = Math.ceil(sleepRemainingMs(timer, now) / 1000);
  if (seconds >= 60) {
    return `${Math.ceil(seconds / 60)}m`;
  }
  return `0:${seconds < 10 ? '0' : ''}${seconds}`;
}
