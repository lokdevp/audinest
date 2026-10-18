import { isRunningInExpoGo } from 'expo';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';

import type { Audiobook, Position } from '@/types';
import {
  bookEnd,
  chapterStart,
  fileTime,
  nextChapterIdx,
  nextFileChapterIdx,
  positionFromFileTime,
  positionInChapter,
  prevChapterIdx,
} from '@/lib/position';
import { rewindSeconds } from '@/lib/resume';
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
/** When playback last stopped, from any source (app, lock screen, headphones). */
let pausedAt: number | null = null;
let undoTimeout: ReturnType<typeof setTimeout> | null = null;

const UNDO_MS = 8000;

const selectedBook = (): Audiobook | null => {
  const id = useProgress.getState().selectedId;
  return id ? (useLibrary.getState().books[id] ?? null) : null;
};

const savePosition = (book: Audiobook, position: Position) =>
  useProgress.getState().setPosition(book.id, position);

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

function onStatus(status: AudioStatus) {
  const wasPlaying = usePlayerState.getState().playing;
  if (wasPlaying && !status.playing) {
    pausedAt = Date.now();
  } else if (status.playing) {
    pausedAt = null;
  }
  usePlayerState.setState({ playing: status.playing });
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
  const position = getPosition(book.id);
  if (book.chapters[position.chapterIdx]?.uri !== loadedUri) {
    return;
  }
  savePosition(book, positionFromFileTime(book, position.chapterIdx, status.currentTime));
}

/** The loaded file ended: continue with the next file of the book, or stop at the end. */
function onFileFinished(book: Audiobook) {
  const nextIdx = nextFileChapterIdx(book, getPosition(book.id).chapterIdx);
  if (nextIdx === -1) {
    savePosition(book, bookEnd(book));
    usePlayerState.setState({ playing: false });
    return;
  }
  savePosition(book, chapterStart(book, nextIdx));
  load(book.chapters[nextIdx].uri, book.chapters[nextIdx].startTime, true);
}

async function load(uri: string, seconds: number, autoplay: boolean) {
  const audio = getPlayer();
  if (loadedUri !== uri) {
    audio.replace({ uri });
    loadedUri = uri;
  }
  seekTarget = seconds;
  staleStatusCount = 0;
  await audio.seekTo(seconds);
  audio.setPlaybackRate(activeBookId ? getSpeed(activeBookId) : useProgress.getState().speed, 'high');
  if (autoplay) {
    audio.play();
  }
}

/** Moves to a position; seeks the player too if the position's file is the loaded one. */
function moveTo(book: Audiobook, position: Position, autoplay = false) {
  savePosition(book, position);
  const { uri } = book.chapters[position.chapterIdx];
  if (book.id !== activeBookId) {
    return;
  }
  if (autoplay || loadedUri === uri) {
    load(uri, fileTime(book, position), autoplay);
  }
}

export async function play() {
  const book = selectedBook();
  if (!book) {
    return;
  }
  await ensureAudioMode();
  activeBookId = book.id;
  let position = getPosition(book.id);
  if (position.totalProgressTime >= book.duration - 1) {
    position = chapterStart(book, 0);
    savePosition(book, position);
  } else if (pausedAt !== null && useSettings.getState().rewindOnResume) {
    const rewind = rewindSeconds(Date.now() - pausedAt);
    if (rewind > 0) {
      position = positionFromFileTime(book, position.chapterIdx, Math.max(0, fileTime(book, position) - rewind));
      savePosition(book, position);
    }
  }
  pausedAt = null;
  const audio = getPlayer();
  const { uri } = book.chapters[position.chapterIdx];
  const target = fileTime(book, position);
  if (loadedUri === uri && audio.isLoaded && Math.abs(audio.currentTime - target) < 2) {
    audio.play();
  } else {
    await load(uri, target, true);
  }
  // The lock screen service is declared by the expo-audio config plugin, so Expo Go doesn't have it.
  if (isRunningInExpoGo()) return;
  try {
    audio.setActiveForLockScreen(
      true,
      { title: book.title, artworkUrl: book.coverUri ?? undefined },
      { showSeekForward: true, showSeekBackward: true },
    );
  } catch (error) {
    console.warn('Lock screen controls unavailable', error);
  }
}

export function pause() {
  player?.pause();
}

/** Jumps `seconds` forward (or back, if negative) inside the current file. */
export function skip(seconds: number) {
  const book = selectedBook();
  if (!book) {
    return;
  }
  const position = getPosition(book.id);
  const { uri } = book.chapters[position.chapterIdx];
  const current = player && loadedUri === uri && book.id === activeBookId
    ? player.currentTime
    : fileTime(book, position);
  moveTo(book, positionFromFileTime(book, position.chapterIdx, Math.max(0, current + seconds)));
}

/** Remembers the current position so a jump away from it can be undone for a few seconds. */
function rememberForUndo(book: Audiobook) {
  if (undoTimeout) {
    clearTimeout(undoTimeout);
  }
  usePlayerState.setState({ undo: { bookId: book.id, position: getPosition(book.id) } });
  undoTimeout = setTimeout(() => usePlayerState.setState({ undo: null }), UNDO_MS);
}

const isPlaying = (book: Audiobook) => usePlayerState.getState().playing && book.id === activeBookId;

/** Seeks to `seconds` into the current chapter (slider). */
export function seekInChapter(seconds: number) {
  const book = selectedBook();
  if (book) {
    rememberForUndo(book);
    moveTo(book, positionInChapter(book, getPosition(book.id).chapterIdx, seconds));
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
  const idx = nextChapterIdx(book, getPosition(book.id).chapterIdx);
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
  const idx = prevChapterIdx(getPosition(book.id).chapterIdx);
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

/** Stops playback before the library is replaced by a rescan. */
export function stop() {
  player?.pause();
  player?.clearLockScreenControls();
  loadedUri = null;
  activeBookId = null;
  pausedAt = null;
  usePlayerState.setState({ playing: false, undo: null });
}
