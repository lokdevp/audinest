import type { Audiobook, Position } from '@/types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Android truncates seek targets to whole milliseconds, so after seeking to a chapter start the player
 * can report a time just before it. Times this close to a chapter start count as inside the chapter.
 */
const CHAPTER_START_TOLERANCE = 0.25;

export const initialPosition = (): Position => ({
  chapterIdx: 0,
  currentTime: 0,
  totalProgressTime: 0,
});

/** Position at the start of a chapter. */
export function chapterStart(book: Audiobook, chapterIdx: number): Position {
  const idx = clamp(chapterIdx, 0, book.chapters.length - 1);
  return {
    chapterIdx: idx,
    currentTime: 0,
    totalProgressTime: book.chapters[idx].totalProgressTime,
  };
}

/** Position `seconds` into the given chapter, clamped to the chapter length if that is known. */
export function positionInChapter(book: Audiobook, chapterIdx: number, seconds: number): Position {
  const chapter = book.chapters[chapterIdx];
  const currentTime = chapter.duration > 0 ? clamp(seconds, 0, chapter.duration) : Math.max(seconds, 0);
  return {
    chapterIdx,
    currentTime,
    totalProgressTime: chapter.totalProgressTime + currentTime,
  };
}

/**
 * Converts a time reported by the player (seconds inside the file of the chapter at
 * `chapterIdx`) into a book position. Moves to whichever chapter of that same file
 * contains the time, so playback or seeking can cross any number of chapter boundaries.
 */
export function positionFromFileTime(book: Audiobook, chapterIdx: number, seconds: number): Position {
  const { uri } = book.chapters[chapterIdx];
  let idx = chapterIdx;
  while (
    idx + 1 < book.chapters.length &&
    book.chapters[idx + 1].uri === uri &&
    seconds >= book.chapters[idx + 1].startTime - CHAPTER_START_TOLERANCE
  ) {
    idx += 1;
  }
  while (
    idx > 0 &&
    book.chapters[idx - 1].uri === uri &&
    seconds < book.chapters[idx].startTime - CHAPTER_START_TOLERANCE
  ) {
    idx -= 1;
  }
  return positionInChapter(book, idx, seconds - book.chapters[idx].startTime);
}

/**
 * Position `seconds` into the whole book, or null if that is past its end. Used to carry a position
 * over when a rescan changed the book's chapters.
 */
export function positionAtBookTime(book: Audiobook, seconds: number): Position | null {
  if (seconds < 0 || seconds >= book.duration) {
    return null;
  }
  // The first chapter starts at 0, so some chapter always matches.
  const idx = book.chapters.findLastIndex((chapter) => chapter.totalProgressTime <= seconds);
  return positionInChapter(book, idx, seconds - book.chapters[idx].totalProgressTime);
}

/** The saved position if it still fits the book's chapters, else the start of the book. */
export function validPosition(book: Audiobook, position: Position | undefined): Position {
  return position && position.chapterIdx < book.chapters.length ? position : initialPosition();
}

/** Seconds inside the chapter's file that a position corresponds to. */
export function fileTime(book: Audiobook, position: Position): number {
  return book.chapters[position.chapterIdx].startTime + position.currentTime;
}

/** Index of the next chapter, or -1 when already on the last one. */
export function nextChapterIdx(book: Audiobook, chapterIdx: number): number {
  return chapterIdx + 1 < book.chapters.length ? chapterIdx + 1 : -1;
}

/** Index of the previous chapter, or -1 when already on the first one. */
export function prevChapterIdx(chapterIdx: number): number {
  return chapterIdx > 0 ? chapterIdx - 1 : -1;
}

/** First chapter stored in a different file than the chapter at `chapterIdx`, or -1. */
export function nextFileChapterIdx(book: Audiobook, chapterIdx: number): number {
  const { uri } = book.chapters[chapterIdx];
  for (let idx = chapterIdx + 1; idx < book.chapters.length; idx += 1) {
    if (book.chapters[idx].uri !== uri) {
      return idx;
    }
  }
  return -1;
}

/** Position at the very end of the book. */
export function bookEnd(book: Audiobook): Position {
  const lastIdx = book.chapters.length - 1;
  return positionInChapter(book, lastIdx, book.chapters[lastIdx].duration);
}

/** True once a position is within a second of the end of the book. Never true if its length is unknown. */
export function isFinished(book: Audiobook, position: Position | undefined): boolean {
  return book.duration > 0 && (position?.totalProgressTime ?? 0) >= book.duration - 1;
}
