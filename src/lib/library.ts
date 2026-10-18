import type { Audiobook, LibrarySort, Position } from '@/types';
import { isFinished } from './position';

export const LIBRARY_SORTS: { value: LibrarySort; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'recent', label: 'Recent' },
  { value: 'progress', label: 'Progress' },
];

const byTitle = (a: Audiobook, b: Audiobook) =>
  a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });

const progress = (book: Audiobook, position: Position | undefined) =>
  book.duration > 0 ? (position?.totalProgressTime ?? 0) / book.duration : 0;

/**
 * Orders the library: by title, most recently played first (never-played books last), or furthest
 * along first. Ties fall back to the title. With `hideFinished`, finished books are left out.
 */
export function sortBooks(
  books: Audiobook[],
  sort: LibrarySort,
  positions: Record<string, Position>,
  lastPlayedAt: Record<string, number>,
  hideFinished: boolean,
): Audiobook[] {
  const shown = hideFinished ? books.filter((book) => !isFinished(book, positions[book.id])) : [...books];
  return shown.sort((a, b) => {
    if (sort === 'recent') {
      const diff = (lastPlayedAt[b.id] ?? -Infinity) - (lastPlayedAt[a.id] ?? -Infinity);
      if (diff !== 0 && !Number.isNaN(diff)) return diff;
    } else if (sort === 'progress') {
      const diff = progress(b, positions[b.id]) - progress(a, positions[a.id]);
      if (diff !== 0) return diff;
    }
    return byTitle(a, b);
  });
}
