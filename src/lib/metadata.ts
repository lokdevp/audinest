import { File } from 'expo-file-system';
import { parseFromTokenizer, type IAudioMetadata, type IChapter, type IPicture } from 'music-metadata';

import { FileHandleTokenizer } from './fileTokenizer';
import { stripExtension } from './names';

export interface FileChapter {
  title: string;
  startTime: number;
  duration: number;
}

export interface FileMetadata {
  album: string | null;
  /** Album artist, else artist. */
  author: string | null;
  /** Track title, else the file name without its extension. */
  trackTitle: string;
  duration: number;
  /** Embedded chapters (M4B chpl / QuickTime chapter track, ID3 CHAP). Empty when there are none. */
  chapters: FileChapter[];
  picture: IPicture | null;
}

/** Chapter lengths from their start times. The last chapter runs to the end of the file. */
function chapterDurations(chapters: Omit<FileChapter, 'duration'>[], duration: number): FileChapter[] {
  return chapters.map((chapter, idx) => {
    const end = idx + 1 < chapters.length ? chapters[idx + 1].startTime : duration;
    return { ...chapter, duration: Math.max(0, end - chapter.startTime) };
  });
}

/** The metadata with a file duration found later (by the probe), and the chapters fitted to it. */
export function withDuration(metadata: FileMetadata, duration: number): FileMetadata {
  return { ...metadata, duration, chapters: chapterDurations(metadata.chapters, duration) };
}

/** Audio before the first chapter shorter than this is added to it instead of getting its own chapter. */
const MIN_INTRO_SECONDS = 1;

const seconds = (time: number, timeScale: number | undefined) => (timeScale ? time / timeScale : time);

/**
 * Embedded chapters sorted by start time, in seconds. Empty if they can't be timed (an MP4 chapter
 * track without a time scale). The first chapter always starts at 0, so no audio is left out.
 */
function embeddedChapters(chapters: IChapter[]): Omit<FileChapter, 'duration'>[] {
  if (chapters.some((chapter) => chapter.timeScale === 0)) {
    return [];
  }
  // ID3 chapters come in table-of-contents order, which needn't be time order.
  const timed = chapters
    .map((chapter) => ({ title: chapter.title, startTime: seconds(chapter.start, chapter.timeScale) }))
    .sort((a, b) => a.startTime - b.startTime)
    .map((chapter, idx) => ({ ...chapter, title: chapter.title || `Chapter ${idx + 1}` }));
  if (timed.length > 0 && timed[0].startTime >= MIN_INTRO_SECONDS) {
    timed.unshift({ title: 'Intro', startTime: 0 });
  } else if (timed.length > 0) {
    timed[0] = { ...timed[0], startTime: 0 };
  }
  return timed;
}

export function toFileMetadata(metadata: IAudioMetadata, fileName: string): FileMetadata {
  const { common, format } = metadata;
  const embedded = embeddedChapters(format.chapters ?? []);
  // ID3 chapters carry their end time, which also gives the file length when the parser has none.
  const chapterEnd = embedded.length > 0
    ? Math.max(0, ...(format.chapters ?? []).map((chapter) => seconds(chapter.end ?? 0, chapter.timeScale)))
    : 0;
  const duration = format.duration || chapterEnd;
  const chapters = chapterDurations(embedded, duration);
  return {
    album: common.album || null,
    author: common.albumartist || common.artist || null,
    trackTitle: common.title || stripExtension(fileName),
    duration,
    chapters,
    picture: common.picture?.[0] ?? null,
  };
}

export async function readFileMetadata(
  file: File,
  { withCover }: { withCover: boolean },
): Promise<FileMetadata> {
  const handle = file.open();
  try {
    const tokenizer = new FileHandleTokenizer(handle, {
      // Some providers report a size of 0 for the file; the open handle knows the real one.
      size: handle.size || file.size,
      mimeType: file.type || undefined,
      path: file.name,
    });
    const metadata = await parseFromTokenizer(tokenizer, {
      includeChapters: true,
      skipCovers: !withCover,
    });
    return toFileMetadata(metadata, file.name);
  } finally {
    handle.close();
  }
}
