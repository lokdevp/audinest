import { create } from 'zustand';

import type { ScanProgress } from '@/lib/scan';
import type { Position } from '@/types';

interface PlayerState {
  playing: boolean;
  /** Set while a library scan is running. */
  scan: ScanProgress | null;
  /** Position before the last chapter jump or seek, offered as "Back to …" for a few seconds. */
  undo: { bookId: string; position: Position } | null;
}

/** Transient UI state, not persisted. */
export const usePlayerState = create<PlayerState>()(() => ({
  playing: false,
  scan: null,
  undo: null,
}));
