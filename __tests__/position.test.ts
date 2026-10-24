import {
  bookEnd,
  chapterStart,
  fileTime,
  isFinished,
  nextChapterIdx,
  nextFileChapterIdx,
  positionAtBookTime,
  positionFromFileTime,
  positionInChapter,
  prevChapterIdx,
  validPosition,
} from '@/lib/position';
import { makeBook, multiFileBook, singleFileBook } from '../test-utils/books';

describe('positionFromFileTime', () => {
  it('stays in the chapter while the time is inside it', () => {
    expect(positionFromFileTime(singleFileBook(), 0, 42)).toEqual({
      chapterIdx: 0,
      currentTime: 42,
      totalProgressTime: 42,
    });
  });

  it('moves to the next chapter of the same file', () => {
    expect(positionFromFileTime(singleFileBook(), 0, 130)).toEqual({
      chapterIdx: 1,
      currentTime: 30,
      totalProgressTime: 130,
    });
  });

  it('crosses several chapters in one jump', () => {
    expect(positionFromFileTime(singleFileBook(), 0, 260).chapterIdx).toBe(2);
  });

  it('moves back when seeking before the chapter start', () => {
    expect(positionFromFileTime(singleFileBook(), 2, 50)).toEqual({
      chapterIdx: 0,
      currentTime: 50,
      totalProgressTime: 50,
    });
  });

  it('clamps at the end of the last chapter instead of running past the book', () => {
    expect(positionFromFileTime(singleFileBook(), 2, 999)).toEqual({
      chapterIdx: 2,
      currentTime: 50,
      totalProgressTime: 300,
    });
  });

  it('never moves into a chapter that belongs to another file', () => {
    const book = multiFileBook();
    // Second chapter of 1.mp3 ends at 100s; the time is clamped, not moved into 2.mp3.
    expect(positionFromFileTime(book, 0, 150)).toEqual({
      chapterIdx: 1,
      currentTime: 40,
      totalProgressTime: 100,
    });
    // In 2.mp3, time 10 is chapter 2, even though 1.mp3 also has a chapter starting at 0.
    expect(positionFromFileTime(book, 2, 10)).toEqual({
      chapterIdx: 2,
      currentTime: 10,
      totalProgressTime: 110,
    });
  });
});

describe('chapter navigation', () => {
  it('reports bounds with -1', () => {
    const book = singleFileBook();
    expect(nextChapterIdx(book, 1)).toBe(2);
    expect(nextChapterIdx(book, 2)).toBe(-1);
    expect(prevChapterIdx(1)).toBe(0);
    expect(prevChapterIdx(0)).toBe(-1);
  });

  it('finds the first chapter in the next file', () => {
    const book = multiFileBook();
    expect(nextFileChapterIdx(book, 0)).toBe(2);
    expect(nextFileChapterIdx(book, 2)).toBe(-1);
    expect(nextFileChapterIdx(singleFileBook(), 0)).toBe(-1);
  });

  it('builds chapter start, in-chapter and end positions', () => {
    const book = singleFileBook();
    expect(chapterStart(book, 1)).toEqual({ chapterIdx: 1, currentTime: 0, totalProgressTime: 100 });
    expect(positionInChapter(book, 1, -5).currentTime).toBe(0);
    expect(bookEnd(book)).toEqual({ chapterIdx: 2, currentTime: 50, totalProgressTime: 300 });
  });

  it('converts a position to a time inside its file', () => {
    const book = singleFileBook();
    expect(fileTime(book, { chapterIdx: 1, currentTime: 20, totalProgressTime: 120 })).toBe(120);
    expect(fileTime(multiFileBook(), { chapterIdx: 2, currentTime: 20, totalProgressTime: 120 })).toBe(20);
  });
});

describe('isFinished', () => {
  const book = singleFileBook();
  const at = (seconds: number) => ({ chapterIdx: 2, currentTime: seconds - 250, totalProgressTime: seconds });

  it('is true within a second of the end of the book', () => {
    expect(isFinished(book, at(298.9))).toBe(false);
    expect(isFinished(book, at(299))).toBe(true);
    expect(isFinished(book, bookEnd(book))).toBe(true);
  });

  it('is false without a saved position', () => {
    expect(isFinished(book, undefined)).toBe(false);
  });

  it('is false when the book length is unknown', () => {
    const unknown = makeBook([['a.mp3', 0, 0]]);
    expect(isFinished(unknown, { chapterIdx: 0, currentTime: 0, totalProgressTime: 0 })).toBe(false);
  });
});

describe('chapter start tolerance', () => {
  it('stays in a chapter when a seek to its start lands just before it', () => {
    expect(positionFromFileTime(singleFileBook(), 1, 99.9995)).toEqual({
      chapterIdx: 1,
      currentTime: 0,
      totalProgressTime: 100,
    });
  });

  it('still moves back for times clearly before the chapter', () => {
    expect(positionFromFileTime(singleFileBook(), 1, 99.5).chapterIdx).toBe(0);
  });
});

describe('unknown chapter length', () => {
  it('does not clamp the position to a duration of 0', () => {
    const book = makeBook([['a.mp3', 0, 0]]);
    expect(positionInChapter(book, 0, 42)).toEqual({ chapterIdx: 0, currentTime: 42, totalProgressTime: 42 });
  });
});

describe('positionAtBookTime', () => {
  it('finds the chapter that contains a time in the book', () => {
    expect(positionAtBookTime(multiFileBook(), 130)).toEqual({
      chapterIdx: 2,
      currentTime: 30,
      totalProgressTime: 130,
    });
  });

  it('is null past the end of the book', () => {
    expect(positionAtBookTime(multiFileBook(), 220)).toBeNull();
  });
});

describe('validPosition', () => {
  it('replaces a chapter index past the end of the book with the start', () => {
    const book = singleFileBook();
    const saved = { chapterIdx: 1, currentTime: 5, totalProgressTime: 105 };
    expect(validPosition(book, saved)).toBe(saved);
    expect(validPosition(book, { ...saved, chapterIdx: 3 })).toEqual({
      chapterIdx: 0,
      currentTime: 0,
      totalProgressTime: 0,
    });
  });
});
