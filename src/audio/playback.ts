import { isRunningInExpoGo } from 'expo';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { Alert } from 'react-native';

import type { Audiobook, Position } from '@/types';
import {
  bookEnd,
  chapterStart,
  fileTime,
  initialPosition,
  isFinished,
  nextChapterIdx,
  nextFileChapterIdx,
  positionAtBookTime,
  positionFromFileTime,
  positionInChapter,
  prevChapterIdx,
} from '@/lib/position';
import { rewindSeconds } from '@/lib/resume';
import { sleepRemainingMs, sleepVolume } from '@/lib/sleep';
import { flushWrites } from '@/store/storage';
import { useLibrary } from '@/store/useLibrary';
import { getPosition, getSpeed, useProgress } from '@/store/useProgress';
import { usePlayerState } from '@/store/usePlayerState';
import { useSettings } from '@/store/useSettings';

/**
 * Single audio player shared by the whole app. Positions are stored per book as
 * (chapter, seconds into chapter); the player only knows seconds into the loaded file,
 * so everything here converts between the two with the helpers in lib/position.
 */
let player: AudioPlayer | null = null;
let loadedUri: string | null = null;
let activeBookId: string | null = null;
/** File time being seeked to. Status updates are ignored until the player gets there. */
let seekTarget: number | null = null;
let staleStatusCount = 0;
let audioModeReady: Promise<void> | null = null;
/** Bumped by every load and by `stop()`, so an older play or load that is still awaiting gives up. */
let generation = 0;
let undoTimeout: ReturnType<typeof setTimeout> | null = null;
/** Pauses at the chapter end for the end-of-chapter sleep timer, between two status updates. */
let chapterStopTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Whether the last status said the player was playing. Kept apart from `usePlayerState.playing`,
 * which `play()` and `pause()` set right away so the button doesn't lag behind the tap.
 */
let statusPlaying = false;
/** Set once an error has been shown for the loaded file, so it isn't shown again on every status. */
let errorShown = false;

const UNDO_MS = 8000;

const selectedBook = (): Audiobook | null => {
  const id = useProgress.getState().selectedId;
  return id ? (useLibrary.getState().books[id] ?? null) : null;
};

const savePosition = (book: Audiobook, position: Position) =>
  useProgress.getState().setPosition(book.id, position);

function reportError(error: unknown) {
  console.warn('Playback failed', error);
  if (errorShown) {
    return;
  }
  errorShown = true;
  usePlayerState.setState({ playing: false });
  Alert.alert(
    "Can't play this book",
    'Its files may have been moved or deleted, or the app lost access to the folder. '
      + 'Rescan the library or pick the folder again from the menu.',
  );
}

function ensureAudioMode() {
  if (!audioModeReady) {
    audioModeReady = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch((error) => console.warn('setAudioModeAsync failed', error));
  }
  return audioModeReady;
}

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 1000 });
    player.addListener('playbackStatusUpdate', onStatus);
  }
  return player;
}

/** Freezes a minutes sleep timer while paused and restarts it when playback resumes. */
function syncSleepTimer(wasPlaying: boolean, playing: boolean) {
  const { sleep } = usePlayerState.getState();
  if (sleep?.kind !== 'minutes' || wasPlaying === playing) {
    return;
  }
  const now = Date.now();
  usePlayerState.setState({
    sleep: playing
      ? { ...sleep, endsAt: now + sleep.remainingMs }
      : { ...sleep, endsAt: null, remainingMs: sleepRemainingMs(sleep, now) },
  });
}

/** Fades out over the last seconds of a minutes sleep timer, then pauses. */
function tickSleepTimer(audio: AudioPlayer) {
  const { sleep } = usePlayerState.getState();
  if (sleep?.kind !== 'minutes' || sleep.endsAt === null) {
    return;
  }
  const remaining = sleepRemainingMs(sleep, Date.now());
  if (remaining > 0) {
    audio.volume = sleepVolume(remaining);
    return;
  }
  audio.pause();
  audio.volume = 1;
  usePlayerState.setState({ sleep: null });
}

function clearChapterStop() {
  if (chapterStopTimer) {
    clearTimeout(chapterStopTimer);
    chapterStopTimer = null;
  }
}

/**
 * Status updates come once a second, so waiting for one past the chapter end would play up to a
 * second of the next chapter (more at higher speeds). When the end is due before the next update,
 * pause on a timer instead. The end of a file is handled by `onFileFinished`.
 */
function scheduleChapterStop(book: Audiobook, position: Position) {
  const chapter = book.chapters[position.chapterIdx];
  const nextIdx = nextChapterIdx(book, position.chapterIdx);
  if (chapterStopTimer || nextIdx === -1 || book.chapters[nextIdx].uri !== chapter.uri || chapter.duration <= 0) {
    return;
  }
  const leftMs = ((chapter.duration - position.currentTime) / getSpeed(book.id)) * 1000;
  if (leftMs > 1500) {
    return;
  }
  chapterStopTimer = setTimeout(() => {
    chapterStopTimer = null;
    if (usePlayerState.getState().sleep?.kind !== 'chapter' || book.id !== activeBookId) {
      return;
    }
    usePlayerState.setState({ sleep: null });
    pause();
    moveTo(book, chapterStart(book, nextIdx));
  }, Math.max(0, leftMs));
}

function onStatus(status: AudioStatus) {
  const wasPlaying = statusPlaying;
  statusPlaying = status.playing;
  if (activeBookId && wasPlaying !== status.playing) {
    // Stored per book and persisted, so rewind on resume also works after the app was killed.
    useProgress.getState().setPausedAt(activeBookId, status.playing ? null : Date.now());
    if (!status.playing) {
      // After this status is handled, so the last position is included.
      setTimeout(flushWrites, 0);
    }
  }
  syncSleepTimer(wasPlaying, status.playing);
  if (wasPlaying !== status.playing) {
    // Only on a change, so a status from a player that is still loading doesn't undo `play()`.
    usePlayerState.setState({ playing: status.playing });
  }
  if (status.error) {
    // Load the file again on the next play, instead of seeking a player that has failed.
    loadedUri = null;
    reportError(status.error);
    return;
  }
  if (status.playing && player) {
    tickSleepTimer(player);
  }
  const book = activeBookId ? useLibrary.getState().books[activeBookId] : undefined;
  if (!book || !loadedUri) {
    return;
  }
  if (status.didJustFinish) {
    onFileFinished(book);
    return;
  }
  if (!status.isLoaded) {
    return;
  }
  if (seekTarget !== null) {
    const reached = Math.abs(status.currentTime - seekTarget) < 1.5;
    staleStatusCount += 1;
    if (!reached && staleStatusCount < 5) {
      return;
    }
    seekTarget = null;
  }
  const position = getPosition(book);
  if (book.chapters[position.chapterIdx]?.uri !== loadedUri) {
    return;
  }
  const next = positionFromFileTime(book, position.chapterIdx, status.currentTime);
  const stopAtChapter = usePlayerState.getState().sleep?.kind === 'chapter';
  if (next.chapterIdx > position.chapterIdx && stopAtChapter) {
    // Playback ran into the next chapter before the timer fired: stop at its start.
    usePlayerState.setState({ sleep: null });
    pause();
    moveTo(book, chapterStart(book, next.chapterIdx));
    return;
  }
  if (stopAtChapter && status.playing) {
    scheduleChapterStop(book, next);
  }
  // Paused players keep reporting the same time; don't rewrite the store for it.
  if (next.chapterIdx === position.chapterIdx && Math.abs(next.currentTime - position.currentTime) < 0.5) {
    return;
  }
  savePosition(book, next);
}

/** The loaded file ended: continue with the next file of the book, or stop at the end. */
function onFileFinished(book: Audiobook) {
  const nextIdx = nextFileChapterIdx(book, getPosition(book).chapterIdx);
  const stopAtChapter = usePlayerState.getState().sleep?.kind === 'chapter';
  if (stopAtChapter) {
    usePlayerState.setState({ sleep: null });
  }
  // ExoPlayer stays set to play after a file ends, so the next file would start without this.
  if (nextIdx === -1 || stopAtChapter) {
    getPlayer().pause();
  }
  if (nextIdx === -1) {
    savePosition(book, bookEnd(book));
    usePlayerState.setState({ playing: false });
    return;
  }
  savePosition(book, chapterStart(book, nextIdx));
  load(book.chapters[nextIdx].uri, book.chapters[nextIdx].startTime, !stopAtChapter).catch(reportError);
}

/** Loads a file and seeks in it. Resolves false if a newer load or `stop()` came first. */
async function load(uri: string, seconds: number, autoplay: boolean): Promise<boolean> {
  const gen = ++generation;
  const audio = getPlayer();
  if (loadedUri !== uri) {
    audio.replace({ uri });
    loadedUri = uri;
    errorShown = false;
  }
  seekTarget = seconds;
  staleStatusCount = 0;
  await audio.seekTo(seconds);
  if (gen !== generation) {
    return false;
  }
  audio.setPlaybackRate(activeBookId ? getSpeed(activeBookId) : useProgress.getState().speed, 'high');
  if (autoplay) {
    audio.play();
  }
  return true;
}

/** Moves to a position; seeks the player too if the position's file is the loaded one. */
function moveTo(book: Audiobook, position: Position, autoplay = false) {
  clearChapterStop();
  savePosition(book, position);
  // A position the user picked is where playback should resume, without rewinding.
  useProgress.getState().setPausedAt(book.id, null);
  const { uri } = book.chapters[position.chapterIdx];
  if (book.id !== activeBookId) {
    return;
  }
  if (autoplay || loadedUri === uri) {
    load(uri, fileTime(book, position), autoplay).catch(reportError);
  }
}

/** Starts or resumes the selected book. Failures are shown to the user, so callers needn't catch. */
export async function play() {
  try {
    await startPlayback();
  } catch (error) {
    reportError(error);
  }
}

async function startPlayback() {
  const book = selectedBook();
  if (!book) {
    return;
  }
  errorShown = false;
  usePlayerState.setState({ playing: true });
  const gen = ++generation;
  await ensureAudioMode();
  if (gen !== generation) {
    return;
  }
  activeBookId = book.id;
  let position = getPosition(book);
  const pausedAt = useProgress.getState().pausedAt[book.id];
  useProgress.getState().markPlayed(book.id);
  if (isFinished(book, position)) {
    position = chapterStart(book, 0);
    savePosition(book, position);
  } else if (pausedAt !== undefined && useSettings.getState().rewindOnResume) {
    const rewind = rewindSeconds(Date.now() - pausedAt);
    if (rewind > 0) {
      // Stays in the current chapter, so resuming at a chapter start doesn't replay the previous one.
      position = positionInChapter(book, position.chapterIdx, position.currentTime - rewind);
      savePosition(book, position);
    }
  }
  useProgress.getState().setPausedAt(book.id, null);
  const audio = getPlayer();
  const { uri } = book.chapters[position.chapterIdx];
  const target = fileTime(book, position);
  if (loadedUri === uri && audio.isLoaded && Math.abs(audio.currentTime - target) < 2) {
    audio.play();
  } else if (!(await load(uri, target, true))) {
    return;
  }
  // The lock screen service is declared by the expo-audio config plugin, so Expo Go doesn't have it.
  if (isRunningInExpoGo()) return;
  try {
    audio.setActiveForLockScreen(
      true,
      { title: book.title, artist: book.author ?? undefined, artworkUrl: book.coverUri ?? undefined },
      { showSeekForward: true, showSeekBackward: true },
    );
  } catch (error) {
    console.warn('Lock screen controls unavailable', error);
  }
}

export function pause() {
  clearChapterStop();
  usePlayerState.setState({ playing: false });
  player?.pause();
}

const isPlaying = (book: Audiobook) => usePlayerState.getState().playing && book.id === activeBookId;

/** Jumps `seconds` forward (or back, if negative), into the previous or next file if needed. */
export function skip(seconds: number) {
  const book = selectedBook();
  if (!book) {
    return;
  }
  const saved = getPosition(book);
  const { uri } = book.chapters[saved.chapterIdx];
  // The saved position lags the player by up to a second. A seek still under way is where it will be.
  const position = player && loadedUri === uri && book.id === activeBookId
    ? positionFromFileTime(book, saved.chapterIdx, seekTarget ?? player.currentTime)
    : saved;
  if (book.duration <= 0) {
    // Without a known length, book time can't be mapped to chapters: stay inside the file.
    moveTo(book, positionFromFileTime(book, position.chapterIdx, Math.max(0, fileTime(book, position) + seconds)));
    return;
  }
  const target = Math.min(Math.max(position.totalProgressTime + seconds, 0), book.duration);
  moveTo(book, positionAtBookTime(book, target) ?? bookEnd(book), isPlaying(book));
}

/** Remembers the current position so a jump away from it can be undone for a few seconds. */
function rememberForUndo(book: Audiobook) {
  if (undoTimeout) {
    clearTimeout(undoTimeout);
  }
  usePlayerState.setState({ undo: { bookId: book.id, position: getPosition(book) } });
  undoTimeout = setTimeout(() => usePlayerState.setState({ undo: null }), UNDO_MS);
}

/** Seeks to `seconds` into the current chapter (slider). */
export function seekInChapter(seconds: number) {
  const book = selectedBook();
  if (book) {
    rememberForUndo(book);
    moveTo(book, positionInChapter(book, getPosition(book).chapterIdx, seconds));
  }
}

export function goToChapter(chapterIdx: number) {
  const book = selectedBook();
  if (book) {
    rememberForUndo(book);
    moveTo(book, chapterStart(book, chapterIdx), isPlaying(book));
  }
}

/** Returns to where the last chapter jump or seek started. */
export function undoJump() {
  const book = selectedBook();
  const { undo } = usePlayerState.getState();
  if (!book || undo?.bookId !== book.id || undo.position.chapterIdx >= book.chapters.length) {
    return;
  }
  if (undoTimeout) {
    clearTimeout(undoTimeout);
  }
  usePlayerState.setState({ undo: null });
  moveTo(book, undo.position, isPlaying(book));
}

export function next() {
  const book = selectedBook();
  if (!book) {
    return;
  }
  const idx = nextChapterIdx(book, getPosition(book).chapterIdx);
  if (idx === -1) {
    pause();
  } else {
    goToChapter(idx);
  }
}

export function prev() {
  const book = selectedBook();
  if (!book) {
    return;
  }
  const idx = prevChapterIdx(getPosition(book).chapterIdx);
  if (idx !== -1) {
    goToChapter(idx);
  }
}

/** Sets the speed of the selected book. */
export function setSpeed(speed: number) {
  const book = selectedBook();
  if (!book) {
    return;
  }
  useProgress.getState().setSpeed(book.id, speed);
  if (book.id === activeBookId) {
    player?.setPlaybackRate(speed, 'high');
  }
}

/** Selects a book. Stops playback if a different book was playing. */
export function selectBook(id: string) {
  if (activeBookId && activeBookId !== id) {
    stop();
  }
  useProgress.getState().select(id);
}

/** Moves a book to its end, so it shows as finished. */
export function markFinished(id: string) {
  const book = useLibrary.getState().books[id];
  if (book) {
    if (id === activeBookId) {
      stop();
    }
    savePosition(book, bookEnd(book));
  }
}

/** Moves a book back to its start. */
export function resetProgress(id: string) {
  const book = useLibrary.getState().books[id];
  if (book) {
    if (id === activeBookId) {
      stop();
    }
    savePosition(book, initialPosition());
  }
}

/** Starts a sleep timer of `minutes`, stops at the end of the chapter, or (null) cancels it. */
export function setSleepTimer(choice: number | 'chapter' | null) {
  clearChapterStop();
  if (player) {
    player.volume = 1;
  }
  if (choice === null || choice === 'chapter') {
    usePlayerState.setState({ sleep: choice && { kind: 'chapter' } });
    return;
  }
  const remainingMs = choice * 60_000;
  const { playing } = usePlayerState.getState();
  usePlayerState.setState({
    sleep: { kind: 'minutes', minutes: choice, remainingMs, endsAt: playing ? Date.now() + remainingMs : null },
  });
}

/** Stops playback before the library is replaced by a rescan. */
export function stop() {
  generation += 1;
  clearChapterStop();
  if (undoTimeout) {
    clearTimeout(undoTimeout);
    undoTimeout = null;
  }
  player?.pause();
  player?.clearLockScreenControls();
  // Unload the file, so a rescan or a deleted book doesn't leave a stale source in the player.
  player?.replace(null);
  loadedUri = null;
  activeBookId = null;
  seekTarget = null;
  staleStatusCount = 0;
  flushWrites();
  if (player) {
    player.volume = 1;
  }
  usePlayerState.setState({ playing: false, undo: null, sleep: null });
}
