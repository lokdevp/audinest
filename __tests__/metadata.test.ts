import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFromTokenizer } from 'music-metadata';

import { FileHandleTokenizer, type RandomAccessHandle } from '@/lib/fileTokenizer';
import { toFileMetadata, withDuration } from '@/lib/metadata';

jest.mock('expo-file-system', () => ({}));

/** Stands in for expo-file-system's FileHandle and records every read. */
function bufferHandle(bytes: Uint8Array) {
  const reads: { offset: number; length: number }[] = [];
  let closed = false;
  const handle: RandomAccessHandle = {
    offset: 0,
    async readBytes(length) {
      const offset = handle.offset ?? 0;
      reads.push({ offset, length });
      const chunk = bytes.slice(offset, offset + length);
      handle.offset = offset + chunk.length;
      return chunk;
    },
    close() {
      closed = true;
    },
  };
  return { handle, reads, isClosed: () => closed };
}

async function parseFixture(name: string) {
  const bytes = new Uint8Array(readFileSync(join(__dirname, '../test-utils/fixtures', name)));
  const fake = bufferHandle(bytes);
  // No path or MIME type, so the parser has to be picked by sniffing the file header.
  const tokenizer = new FileHandleTokenizer(fake.handle, { size: bytes.length });
  const metadata = await parseFromTokenizer(tokenizer, { includeChapters: true });
  await tokenizer.close();
  return { metadata: toFileMetadata(metadata, name), ...fake, size: bytes.length };
}

describe('metadata parsing through FileHandleTokenizer', () => {
  it('reads title, duration and chapters from an M4B', async () => {
    const { metadata, isClosed } = await parseFixture('book.m4b');
    expect(metadata.album).toBe('Test Book');
    expect(metadata.author).toBeNull();
    expect(metadata.duration).toBeCloseTo(6, 0);
    expect(metadata.chapters.map((chapter) => chapter.title)).toEqual(['Opening', 'Middle', 'End']);
    expect(metadata.chapters[1].startTime).toBeCloseTo(2, 1);
    expect(metadata.chapters[1].duration).toBeCloseTo(3, 1);
    expect(isClosed()).toBe(true);
  });

  it('reads tags and the embedded cover from an MP3', async () => {
    const { metadata } = await parseFixture('track.mp3');
    expect(metadata.album).toBe('Mp3 Album');
    expect(metadata.trackTitle).toBe('Track One');
    expect(metadata.author).toBe('Mp3 Author');
    expect(metadata.duration).toBeGreaterThan(2);
    expect(metadata.chapters).toEqual([]);
    expect(metadata.picture?.format).toBe('image/png');
  });

  it('falls back to the file name when there are no tags', () => {
    const metadata = toFileMetadata({ common: {}, format: {} } as never, '03 - Untitled.mp3');
    expect(metadata).toMatchObject({ album: null, trackTitle: '03 - Untitled', duration: 0 });
  });
  describe('embedded chapters', () => {
    const chapters = (format: object) => toFileMetadata({ common: {}, format } as never, 'book.mp3');

    it('sorts them by start time and fills in missing titles', () => {
      const metadata = chapters({
        duration: 300,
        chapters: [{ title: 'Two', start: 100 }, { title: '', start: 0 }, { title: 'Three', start: 200 }],
      });
      expect(metadata.chapters).toEqual([
        { title: 'Chapter 1', startTime: 0, duration: 100 },
        { title: 'Two', startTime: 100, duration: 100 },
        { title: 'Three', startTime: 200, duration: 100 },
      ]);
    });

    it('adds a chapter for audio before the first one', () => {
      const metadata = chapters({ duration: 100, chapters: [{ title: 'One', start: 30 }] });
      expect(metadata.chapters.map((chapter) => [chapter.title, chapter.startTime])).toEqual([['Intro', 0], ['One', 30]]);
    });

    it('ignores chapters without a time scale', () => {
      const metadata = chapters({ duration: 100, chapters: [{ title: 'One', start: 0, timeScale: 0 }] });
      expect(metadata.chapters).toEqual([]);
    });

    it('takes the file length from the chapter ends when the parser has none', () => {
      const metadata = chapters({ chapters: [{ title: 'One', start: 0, end: 60 }, { title: 'Two', start: 60, end: 90 }] });
      expect(metadata.duration).toBe(90);
      expect(metadata.chapters.map((chapter) => chapter.duration)).toEqual([60, 30]);
    });
  });

  it('fits the last chapter to a duration found later', () => {
    const format = { chapters: [{ title: 'One', start: 0 }, { title: 'Two', start: 60 }] };
    const metadata = withDuration(toFileMetadata({ common: {}, format } as never, 'book.mp3'), 150);
    expect(metadata.duration).toBe(150);
    expect(metadata.chapters.map((chapter) => chapter.duration)).toEqual([60, 90]);
  });
});
