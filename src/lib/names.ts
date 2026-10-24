/** Lower-case extension of a file name, without the dot. Empty if it has none. */
export const extension = (name: string) => name.match(/\.([^/.]+)$/)?.[1]?.toLowerCase() ?? '';

export const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, '');

// One collator for all comparisons: `localeCompare` with options builds a new one on every call.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Natural order, ignoring case: "Track 2" before "track 10". */
export const naturalCompare = (a: string, b: string) => collator.compare(a, b);
