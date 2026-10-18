/** Seconds to go back when resuming after a pause of `pausedMs`: longer pauses rewind further. */
export function rewindSeconds(pausedMs: number): number {
  const seconds = pausedMs / 1000;
  if (seconds < 30) return 0;
  if (seconds < 5 * 60) return 5;
  if (seconds < 60 * 60) return 15;
  return 30;
}
