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

/** `busy` when another scan was already running, `failed` when the folder couldn't be read. */
export type ScanResult = 'done' | 'busy' | 'failed';

/**
 * Rescans the library folder. Saved positions of books that are still there are kept. Unless `full`
 * is set, unchanged books of the same folder are kept as they are instead of being parsed again.
 * Never rejects: a failure is logged and returned as `failed`, and the library is left as it was.
 */
export async function loadLibrary(libraryUri: string, { full = false } = {}): Promise<ScanResult> {
  if (usePlayerState.getState().scan) {
    return 'busy';
  }
  stop();
  usePlayerState.setState({ scan: { phase: 'listing', done: 0, total: 0 } });
  try {
    const library = useLibrary.getState();
    const previous = library.libraryUri === libraryUri ? library.books : {};
    const books = await scanLibrary(libraryUri, (scan) => usePlayerState.setState({ scan }), previous, { full });
    useLibrary.getState().setLibrary(libraryUri, books);
    useProgress.getState().syncWithLibrary(books);
    pruneCovers(books);
    return 'done';
  } catch (error) {
    console.warn('Scan failed', error);
    return 'failed';
  } finally {
    usePlayerState.setState({ scan: null });
  }
}
