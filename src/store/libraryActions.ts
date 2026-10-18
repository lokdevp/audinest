import { Directory } from 'expo-file-system';

import { stop } from '@/audio/playback';
import { pruneCovers, scanLibrary } from '@/lib/scan';
import { useLibrary } from './useLibrary';
import { useProgress } from './useProgress';
import { usePlayerState } from './usePlayerState';

/** Opens the system folder picker. Resolves null if the user cancels. */
export async function pickLibraryFolder(): Promise<string | null> {
  try {
    const directory = await Directory.pickDirectoryAsync(useLibrary.getState().libraryUri ?? undefined);
    return directory.uri;
  } catch (error) {
    console.log('Folder picker closed', error);
    return null;
  }
}

/** Rescans the library folder. Saved positions of books that are still there are kept. */
export async function loadLibrary(libraryUri: string) {
  if (usePlayerState.getState().scan) {
    return;
  }
  stop();
  usePlayerState.setState({ scan: { done: 0, total: 0 } });
  try {
    const books = await scanLibrary(libraryUri, (scan) => usePlayerState.setState({ scan }));
    useLibrary.getState().setLibrary(libraryUri, books);
    useProgress.getState().syncWithLibrary(books);
    pruneCovers(books);
  } finally {
    usePlayerState.setState({ scan: null });
  }
}
