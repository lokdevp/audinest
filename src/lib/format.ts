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

const safeDecode = (text: string) => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

/** Volume label for a SAF volume id: `primary`, `home` or an SD card id like `1A2B-3C4D`. */
function volumeLabel(volume: string): string {
  if (volume === 'primary') return 'Internal storage';
  if (volume === 'home') return 'Documents';
  if (/^[0-9A-F]{4}-[0-9A-F]{4}$/i.test(volume)) return 'SD card';
  return volume;
}

/** Readable name for a SAF tree URI: `…/tree/primary%3AAudiobooks` → `Internal storage › Audiobooks`. */
export function folderLabel(uri: string): string {
  const match = /\/tree\/(.*)$/.exec(uri);
  if (!match) {
    return safeDecode(uri);
  }
  const treeId = safeDecode(match[1].split('/document/')[0]).replace(/\/+$/, '');
  const colon = treeId.indexOf(':');
  if (colon < 0) {
    return treeId.split('/').filter(Boolean).pop() ?? treeId;
  }
  const parts = treeId.slice(colon + 1).split('/').filter(Boolean);
  return [volumeLabel(treeId.slice(0, colon)), ...parts].join(' › ');
}
