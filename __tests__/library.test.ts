import { sortBooks } from '@/lib/library';
import { makeBook } from '../test-utils/books';

const book = (id: string) => makeBook([[`${id}.mp3`, 0, 100]], id);
const at = (seconds: number) => ({ chapterIdx: 0, currentTime: seconds, totalProgressTime: seconds });

const books = [book('Book 10'), book('Book 2'), book('Alpha'), book('Done')];
const positions = { 'Book 2': at(50), Alpha: at(10), Done: at(100) };
const lastPlayedAt = { Alpha: 3000, 'Book 10': 1000, Done: 2000 };
const ids = (sorted: { id: string }[]) => sorted.map(({ id }) => id);

describe('sortBooks', () => {
  it('sorts by title in natural order', () => {
    expect(ids(sortBooks(books, 'title', positions, lastPlayedAt, false)))
      .toEqual(['Alpha', 'Book 2', 'Book 10', 'Done']);
  });

  it('puts the most recently played first and never-played books last', () => {
    expect(ids(sortBooks(books, 'recent', positions, lastPlayedAt, false)))
      .toEqual(['Alpha', 'Done', 'Book 10', 'Book 2']);
  });

  it('puts the furthest along first, ties by title', () => {
    expect(ids(sortBooks(books, 'progress', positions, lastPlayedAt, false)))
      .toEqual(['Done', 'Book 2', 'Alpha', 'Book 10']);
  });

  it('hides finished books and does not change the input', () => {
    const copy = [...books];
    expect(ids(sortBooks(books, 'title', positions, lastPlayedAt, true))).toEqual(['Alpha', 'Book 2', 'Book 10']);
    expect(books).toEqual(copy);
  });
});
