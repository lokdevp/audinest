import type { Audiobook, Chapter } from '@/types';

/** Builds chapters with running totals from [uri, startTime, duration] tuples. */
export function makeBook(parts: [string, number, number][], id = 'book'): Audiobook {
  let total = 0;
  const chapters: Chapter[] = parts.map(([uri, startTime, duration], idx) => {
    const chapter = { title: `Chapter ${idx + 1}`, uri, startTime, duration, totalProgressTime: total };
    total += duration;
    return chapter;
  });
  return { id, title: id, type: 'M4BFILE', duration: total, coverUri: null, chapters };
}

/** One M4B file with three chapters (0-100, 100-250, 250-300). */
export const singleFileBook = () => makeBook([['a.m4b', 0, 100], ['a.m4b', 100, 150], ['a.m4b', 250, 50]]);

/** Two files: file 1 has two chapters, file 2 has one. */
export const multiFileBook = () => makeBook([['1.mp3', 0, 60], ['1.mp3', 60, 40], ['2.mp3', 0, 120]]);
