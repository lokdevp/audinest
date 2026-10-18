import { assembleAudiobook, classifyEntries, type Entry, type ParsedFile } from '@/lib/scan';
import type { FileMetadata } from '@/lib/metadata';

jest.mock('expo-file-system', () => ({}));
jest.mock('expo-crypto', () => ({}));
jest.mock('expo-audio', () => ({}));

const file = (name: string, dir = 'root'): Entry => ({ name, uri: `${dir}/${name}`, isDirectory: false });
const dir = (name: string): Entry => ({ name, uri: `root/${name}`, isDirectory: true });

const meta = (overrides: Partial<FileMetadata> = {}): FileMetadata => ({
  album: null,
  trackTitle: 'Track',
  duration: 10,
  chapters: [],
  picture: null,
  ...overrides,
});

describe('classifyEntries', () => {
  const tree: Record<string, Entry[]> = {
    'root/Mp3 Book': [
      file('track 10.mp3', 'root/Mp3 Book'),
      file('track 2.mp3', 'root/Mp3 Book'),
      file('cover.jpg', 'root/Mp3 Book'),
      file('notes.txt', 'root/Mp3 Book'),
    ],
    'root/Empty': [file('readme.txt', 'root/Empty')],
  };
  const sources = classifyEntries(
    [dir('Mp3 Book'), file('Single.M4B'), dir('Empty'), file('image.png')],
    (entry) => tree[entry.uri] ?? [],
  );

  it('turns audio directories and audio files into books and skips the rest', () => {
    expect(sources.map((source) => source.name)).toEqual(['Mp3 Book', 'Single.M4B']);
  });

  it('sorts directory files in natural order and picks the cover image', () => {
    const [mp3Book] = sources;
    expect(mp3Book.audio.map((entry) => entry.name)).toEqual(['track 2.mp3', 'track 10.mp3']);
    expect(mp3Book.image?.name).toBe('cover.jpg');
  });
});

describe('assembleAudiobook', () => {
  it('makes one chapter per file for a directory without embedded chapters', () => {
    const source = {
      id: 'root/Book', name: 'Book', isDirectory: true, image: null,
      audio: [file('1.mp3'), file('2.mp3')],
    };
    const files: ParsedFile[] = [
      { entry: source.audio[0], metadata: meta({ album: 'The Album', trackTitle: 'One', duration: 30 }) },
      { entry: source.audio[1], metadata: meta({ trackTitle: 'Two', duration: 45 }) },
    ];
    const book = assembleAudiobook(source, files, 'file:///cover.jpg');
    expect(book).toMatchObject({ id: 'root/Book', title: 'The Album', type: 'MP3DIR', duration: 75, coverUri: 'file:///cover.jpg' });
    expect(book.chapters).toEqual([
      { title: 'One', uri: 'root/1.mp3', startTime: 0, duration: 30, totalProgressTime: 0 },
      { title: 'Two', uri: 'root/2.mp3', startTime: 0, duration: 45, totalProgressTime: 30 },
    ]);
  });

  it('uses embedded chapters of a single M4B file', () => {
    const entry = file('Story.m4b');
    const source = { id: entry.uri, name: entry.name, isDirectory: false, image: null, audio: [entry] };
    const chapters = [
      { title: 'A', startTime: 0, duration: 100 },
      { title: 'B', startTime: 100, duration: 50 },
    ];
    const book = assembleAudiobook(source, [{ entry, metadata: meta({ duration: 150, chapters }) }], null);
    expect(book.type).toBe('M4BFILE');
    expect(book.title).toBe('Track');
    expect(book.chapters.map((chapter) => [chapter.startTime, chapter.totalProgressTime])).toEqual([[0, 0], [100, 100]]);
  });

  it('falls back to the directory name when there is no album tag', () => {
    const source = { id: 'root/Dir', name: 'Dir', isDirectory: true, image: null, audio: [file('a.m4b')] };
    const book = assembleAudiobook(source, [{ entry: source.audio[0], metadata: meta() }], null);
    expect(book).toMatchObject({ title: 'Dir', type: 'M4BDIR' });
  });
});
