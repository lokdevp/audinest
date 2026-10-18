import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { LibrarySort } from '@/types';
import { asyncStorage } from './storage';

export const SKIP_OPTIONS = [10, 15, 20, 30, 45, 60];

interface SettingsState {
  skipBack: number;
  skipForward: number;
  /** Go back a few seconds when resuming after a pause. */
  rewindOnResume: boolean;
  librarySort: LibrarySort;
  hideFinished: boolean;
  setSkipBack: (seconds: number) => void;
  setSkipForward: (seconds: number) => void;
  setRewindOnResume: (enabled: boolean) => void;
  setLibrarySort: (sort: LibrarySort) => void;
  setHideFinished: (hide: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      skipBack: 20,
      skipForward: 20,
      rewindOnResume: true,
      librarySort: 'title',
      hideFinished: false,
      setSkipBack: (skipBack) => set({ skipBack }),
      setSkipForward: (skipForward) => set({ skipForward }),
      setRewindOnResume: (rewindOnResume) => set({ rewindOnResume }),
      setLibrarySort: (librarySort) => set({ librarySort }),
      setHideFinished: (hideFinished) => set({ hideFinished }),
    }),
    { name: 'settings', storage: asyncStorage, version: 1 },
  ),
);
