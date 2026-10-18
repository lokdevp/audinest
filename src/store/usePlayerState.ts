import { create } from 'zustand';

import type { ScanProgress } from '@/lib/scan';

interface PlayerState {
  playing: boolean;
  /** Set while a library scan is running. */
  scan: ScanProgress | null;
}

/** Transient UI state, not persisted. */
export const usePlayerState = create<PlayerState>()(() => ({
  playing: false,
  scan: null,
}));
