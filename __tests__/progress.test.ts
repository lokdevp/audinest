import { reconcilePositions } from '@/store/useProgress';
import { makeBook } from '../test-utils/books';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('reconcilePositions after a rescan', () => {
  const kept = makeBook([['a.mp3', 0, 100]], 'kept');
  const shrunk = makeBook([['b.mp3', 0, 100]], 'shrunk');
  const added = makeBook([['c.mp3', 0, 100]], 'added');
  const saved = {
    kept: { chapterIdx: 0, currentTime: 42, totalProgressTime: 42 },
    shrunk: { chapterIdx: 5, currentTime: 1, totalProgressTime: 501 },
    removed: { chapterIdx: 0, currentTime: 9, totalProgressTime: 9 },
  };

  const result = reconcilePositions(saved, [kept, shrunk, added]);

  it('keeps positions of books that are still in the library', () => {
    expect(result.kept).toEqual(saved.kept);
  });

  it('resets invalid positions and starts new books at zero', () => {
    expect(result.shrunk).toEqual({ chapterIdx: 0, currentTime: 0, totalProgressTime: 0 });
    expect(result.added).toEqual({ chapterIdx: 0, currentTime: 0, totalProgressTime: 0 });
  });

  it('drops books that are gone', () => {
    expect(result).not.toHaveProperty('removed');
  });
});
