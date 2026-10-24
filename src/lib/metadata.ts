import { File } from 'expo-file-system';
import { parseFromTokenizer, type IAudioMetadata, type IPicture } from 'music-metadata';

import { FileHandleTokenizer } from './fileTokenizer';

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

export const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, '');

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

export function toFileMetadata(metadata: IAudioMetadata, fileName: string): FileMetadata {
  const { common, format } = metadata;
  const duration = format.duration ?? 0;
  const embedded = (format.chapters ?? []).map((chapter, idx) => ({
    title: chapter.title || `Chapter ${idx + 1}`,
    startTime: chapter.timeScale ? chapter.start / chapter.timeScale : chapter.start,
  }));
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
  const tokenizer = new FileHandleTokenizer(file.open(), {
    size: file.size,
    mimeType: file.type || undefined,
    path: file.name,
  });
  try {
    const metadata = await parseFromTokenizer(tokenizer, {
      includeChapters: true,
      skipCovers: !withCover,
    });
    return toFileMetadata(metadata, file.name);
  } finally {
    await tokenizer.close();
  }
}
