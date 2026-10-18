const pad = (amount: number) => (amount < 10 ? `0${amount}` : `${amount}`);

/** Formats seconds as `mm:ss`, or `h:mm:ss` once the time reaches an hour. */
export function formattedTime(timeInSeconds: number | undefined): string {
  if (timeInSeconds === undefined || !Number.isFinite(timeInSeconds)) {
    return '';
  }
  const total = Math.max(0, Math.floor(timeInSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Formats seconds as `2h 14m`, or `34m 12s` under an hour. */
export function formattedDuration(timeInSeconds: number): string {
  const total = Number.isFinite(timeInSeconds) ? Math.max(0, Math.floor(timeInSeconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
