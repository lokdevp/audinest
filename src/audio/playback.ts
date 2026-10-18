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
import { useLibrary } from '@/store/useLibrary';
import { getPosition, useProgress } from '@/store/useProgress';
import { usePlayerState } from '@/store/usePlayerState';

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
  audio.setPlaybackRate(useProgress.getState().speed, 'high');
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
  }
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

/** Seeks to `seconds` into the current chapter (slider). */
export function seekInChapter(seconds: number) {
  const book = selectedBook();
  if (book) {
    moveTo(book, positionInChapter(book, getPosition(book.id).chapterIdx, seconds));
  }
}

export function goToChapter(chapterIdx: number) {
  const book = selectedBook();
  if (book) {
    const playing = usePlayerState.getState().playing && book.id === activeBookId;
    moveTo(book, chapterStart(book, chapterIdx), playing);
  }
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

export function setSpeed(speed: number) {
  useProgress.getState().setSpeed(speed);
  player?.setPlaybackRate(speed, 'high');
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
  usePlayerState.setState({ playing: false });
}
