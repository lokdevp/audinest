import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Audiobook, Position } from '@/types';
import { initialPosition, positionAtBookTime, positionInChapter, validPosition } from '@/lib/position';
import { asyncStorage } from './storage';

interface ProgressState {
  positions: Record<string, Position>;
  selectedId: string | null;
  /** Default speed, used by books that have no speed of their own. */
  speed: number;
  speeds: Record<string, number>;
  /** When each book was last started, in ms since epoch. */
  lastPlayedAt: Record<string, number>;
  select: (id: string) => void;
  setPosition: (id: string, position: Position) => void;
  markPlayed: (id: string) => void;
  /** Sets the speed of a book, and the default for books without one. */
  setSpeed: (id: string, speed: number) => void;
  /** After a rescan: keep positions of books that still exist and are still valid, reset the rest. */
  syncWithLibrary: (books: Audiobook[]) => void;
}

/**
 * Fits saved positions to the rescanned books. A position whose chapter still exists is clamped to it;
 * otherwise it is carried over by its time in the book, or reset if that is past the end.
 */
export function reconcilePositions(
  positions: Record<string, Position>,
  books: Audiobook[],
): Record<string, Position> {
  return Object.fromEntries(
    books.map((book) => {
      const saved = positions[book.id];
      if (!saved) {
        return [book.id, initialPosition()];
      }
      const position = saved.chapterIdx < book.chapters.length
        ? positionInChapter(book, saved.chapterIdx, saved.currentTime)
        : positionAtBookTime(book, saved.totalProgressTime);
      return [book.id, position ?? initialPosition()];
    }),
  );
}

/** Keeps only the entries of books that are still in the library. */
export function pruneRecord<T>(record: Record<string, T>, books: Audiobook[]): Record<string, T> {
  return Object.fromEntries(
    books.filter((book) => book.id in record).map((book) => [book.id, record[book.id]]),
  );
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      positions: {},
      selectedId: null,
      speed: 1,
      speeds: {},
      lastPlayedAt: {},
      select: (id) => set({ selectedId: id }),
      setPosition: (id, position) =>
        set((state) => ({ positions: { ...state.positions, [id]: position } })),
      markPlayed: (id) => set((state) => ({ lastPlayedAt: { ...state.lastPlayedAt, [id]: Date.now() } })),
      setSpeed: (id, speed) => set((state) => ({ speed, speeds: { ...state.speeds, [id]: speed } })),
      syncWithLibrary: (books) =>
        set((state) => ({
          positions: reconcilePositions(state.positions, books),
          speeds: pruneRecord(state.speeds, books),
          lastPlayedAt: pruneRecord(state.lastPlayedAt, books),
          selectedId: books.some((book) => book.id === state.selectedId) ? state.selectedId : null,
        })),
    }),
    { name: 'progress', storage: asyncStorage, version: 1 },
  ),
);

/** Saved position of a book, or its start if the position doesn't fit its chapters. */
export const getPosition = (book: Audiobook): Position =>
  validPosition(book, useProgress.getState().positions[book.id]);

export const getSpeed = (id: string): number => {
  const { speeds, speed } = useProgress.getState();
  return speeds[id] ?? speed;
};
