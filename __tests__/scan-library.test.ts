import { scanLibrary } from '@/lib/scan';
import { probeDuration } from '@/audio/probe';
import { readFileMetadata } from '@/lib/metadata';
import type { Audiobook } from '@/types';

/** A fake SAF mockTree: directory uri -> children, file uri -> size and modification time. */
const mockTree: Record<string, string[]> = {};
const mockStamps: Record<string, { size: number; modificationTime: number }> = {};

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(path: string) {
      this.uri = path;
    }
    get name() {
      return this.uri.split('/').pop();
    }
    get exists() {
      return true;
    }
    info() {
      return mockStamps[this.uri] ?? {};
    }
  }
  class Directory extends File {
    list() {
      return (mockTree[this.uri] ?? []).map((uri) => (uri in mockTree ? new Directory(uri) : new File(uri)));
    }
  }
  return { File, Directory, Paths: { document: 'file:///document' } };
});
jest.mock('expo-crypto', () => ({}));
jest.mock('@/audio/probe', () => ({ probeDuration: jest.fn() }));
jest.mock('@/lib/metadata', () => ({
  ...jest.requireActual('@/lib/metadata'),
  readFileMetadata: jest.fn(async () => ({
    album: null, author: null, trackTitle: 'Track', duration: 10, chapters: [], picture: null,
  })),
}));

const parse = readFileMetadata as jest.Mock;
const mockProbe = probeDuration as jest.Mock;

beforeEach(() => {
  Object.assign(mockTree, { root: ['root/A.mp3', 'root/B.mp3'] });
  Object.assign(mockStamps, {
    'root/A.mp3': { size: 100, modificationTime: 1 },
    'root/B.mp3': { size: 200, modificationTime: 2 },
  });
  parse.mockClear();
  mockProbe.mockReset();
});

const byId = (books: Audiobook[]) => Object.fromEntries(books.map((book) => [book.id, book]));

it('parses every book on the first scan and stores fingerprints', async () => {
  const books = await scanLibrary('root', () => {});
  expect(parse).toHaveBeenCalledTimes(2);
  expect(books.map((book) => book.fingerprint)).toEqual(['A.mp3:100:1', 'B.mp3:200:2']);
});

it('reuses unchanged books and parses only changed ones', async () => {
  const first = byId(await scanLibrary('root', () => {}));
  first['root/A.mp3'] = { ...first['root/A.mp3'], title: 'Kept' };
  parse.mockClear();
  mockStamps['root/B.mp3'] = { size: 201, modificationTime: 3 };

  const books = await scanLibrary('root', () => {}, first);
  expect(parse).toHaveBeenCalledTimes(1);
  expect(parse.mock.calls[0][0].uri).toBe('root/B.mp3');
  expect(books[0]).toBe(first['root/A.mp3']);
  expect(books[1].fingerprint).toBe('B.mp3:201:3');
});

it('parses again when a file has no modification time', async () => {
  const first = byId(await scanLibrary('root', () => {}));
  parse.mockClear();
  mockStamps['root/A.mp3'] = { size: 100 } as never;
  await scanLibrary('root', () => {}, first);
  expect(parse).toHaveBeenCalledTimes(1);
});

it('parses every book on a full rescan', async () => {
  const first = byId(await scanLibrary('root', () => {}));
  parse.mockClear();
  await scanLibrary('root', () => {}, first, { full: true });
  expect(parse).toHaveBeenCalledTimes(2);
});

it('keeps the previous version of a book that fails to parse', async () => {
  const first = byId(await scanLibrary('root', () => {}));
  parse.mockRejectedValueOnce(new Error('EIO'));
  mockProbe.mockResolvedValueOnce(0);

  const books = await scanLibrary('root', () => {}, first, { full: true });
  expect(books.map((book) => book.id)).toEqual(['root/A.mp3', 'root/B.mp3']);
  expect(books[0]).toBe(first['root/A.mp3']);
});

it('skips a new book that fails to parse', async () => {
  parse.mockRejectedValueOnce(new Error('EIO'));
  mockProbe.mockResolvedValueOnce(0);
  const books = await scanLibrary('root', () => {});
  expect(books.map((book) => book.id)).toEqual(['root/B.mp3']);
});

describe('a folder with a file whose tags cannot be read', () => {
  beforeEach(() => {
    mockTree.root = ['root/Book'];
    mockTree['root/Book'] = ['root/Book/1.mp3', 'root/Book/2.mp3', 'root/Book/3.mp3'];
    parse
      .mockResolvedValueOnce({ album: null, author: null, trackTitle: 'One', duration: 10, chapters: [], picture: null })
      .mockRejectedValueOnce(new Error('CouldNotDetermineFileTypeError'));
  });

  it('asks the player for the duration of that file', async () => {
    mockProbe.mockResolvedValueOnce(20);
    const [book] = await scanLibrary('root', () => {});
    expect(book.chapters.map((chapter) => [chapter.title, chapter.duration])).toEqual([['One', 10], ['2', 20], ['Track', 10]]);
  });

  it('skips only that file if the player cannot read it either', async () => {
    mockProbe.mockResolvedValueOnce(0);
    const [book] = await scanLibrary('root', () => {});
    expect(book.chapters.map((chapter) => chapter.uri)).toEqual(['root/Book/1.mp3', 'root/Book/3.mp3']);
  });
});
