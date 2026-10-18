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
  /** Track title, else the file name without its extension. */
  trackTitle: string;
  duration: number;
  /** Embedded chapters (M4B chpl / QuickTime chapter track, ID3 CHAP). Empty when there are none. */
  chapters: FileChapter[];
  picture: IPicture | null;
}

export const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, '');

export function toFileMetadata(metadata: IAudioMetadata, fileName: string): FileMetadata {
  const { common, format } = metadata;
  const duration = format.duration ?? 0;
  const embedded = (format.chapters ?? []).map((chapter, idx) => ({
    title: chapter.title || `Chapter ${idx + 1}`,
    startTime: chapter.timeScale ? chapter.start / chapter.timeScale : chapter.start,
  }));
  const chapters = embedded.map((chapter, idx) => {
    const end = idx + 1 < embedded.length ? embedded[idx + 1].startTime : duration;
    return { ...chapter, duration: Math.max(0, end - chapter.startTime) };
  });
  return {
    album: common.album || null,
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
