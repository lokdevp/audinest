import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Audiobook } from '@/types';
import { fileStorage } from './storage';

interface LibraryState {
  /** SAF URI of the folder the user picked. */
  libraryUri: string | null;
  books: Record<string, Audiobook>;
  setLibrary: (libraryUri: string, books: Audiobook[]) => void;
}

/** The scanned library. Kept apart from positions so the frequent position writes stay small. */
export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      libraryUri: null,
      books: {},
      setLibrary: (libraryUri, books) =>
        set({ libraryUri, books: Object.fromEntries(books.map((book) => [book.id, book])) }),
    }),
    { name: 'library', storage: fileStorage, version: 1 },
  ),
);
