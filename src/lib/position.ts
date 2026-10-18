import type { Audiobook, Position } from '@/types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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

/** Position `seconds` into the given chapter, clamped to the chapter length. */
export function positionInChapter(book: Audiobook, chapterIdx: number, seconds: number): Position {
  const chapter = book.chapters[chapterIdx];
  const currentTime = clamp(seconds, 0, chapter.duration);
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
    seconds >= book.chapters[idx + 1].startTime
  ) {
    idx += 1;
  }
  while (idx > 0 && book.chapters[idx - 1].uri === uri && seconds < book.chapters[idx].startTime) {
    idx -= 1;
  }
  return positionInChapter(book, idx, seconds - book.chapters[idx].startTime);
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
