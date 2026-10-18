import { sleepLabel, sleepRemainingMs, sleepVolume } from '@/lib/sleep';

describe('sleepVolume', () => {
  it('stays at full volume until the fade starts', () => {
    expect(sleepVolume(60_000)).toBe(1);
    expect(sleepVolume(10_000)).toBe(1);
  });

  it('fades linearly to silence and clamps', () => {
    expect(sleepVolume(5_000)).toBe(0.5);
    expect(sleepVolume(0)).toBe(0);
    expect(sleepVolume(-1_000)).toBe(0);
  });
});

describe('sleepRemainingMs', () => {
  it('counts down while playing and is frozen while paused', () => {
    expect(sleepRemainingMs({ kind: 'minutes', endsAt: 10_000, remainingMs: 10_000 }, 4_000)).toBe(6_000);
    expect(sleepRemainingMs({ kind: 'minutes', endsAt: 10_000, remainingMs: 10_000 }, 12_000)).toBe(0);
    expect(sleepRemainingMs({ kind: 'minutes', endsAt: null, remainingMs: 7_000 }, 99_000)).toBe(7_000);
  });

  it('never reports more than was left when the timer started', () => {
    expect(sleepRemainingMs({ kind: 'minutes', endsAt: 10_000, remainingMs: 6_000 }, 0)).toBe(6_000);
  });
});

describe('sleepLabel', () => {
  const paused = (remainingMs: number) => ({ kind: 'minutes' as const, endsAt: null, remainingMs });

  it('shows whole minutes, rounded up', () => {
    expect(sleepLabel(paused(30 * 60_000), 0)).toBe('30m');
    expect(sleepLabel(paused(22 * 60_000 + 1), 0)).toBe('23m');
    expect(sleepLabel(paused(60_000), 0)).toBe('1m');
  });

  it('shows seconds in the last minute', () => {
    expect(sleepLabel(paused(45_000), 0)).toBe('0:45');
    expect(sleepLabel(paused(5_000), 0)).toBe('0:05');
  });

  it('names the end-of-chapter mode', () => {
    expect(sleepLabel({ kind: 'chapter' }, 0)).toBe('End of chapter');
  });
});
