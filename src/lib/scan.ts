import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { Audiobook, BookType, Chapter } from '@/types';
import { probeDuration } from '@/audio/probe';
import { readFileMetadata, stripExtension, type FileMetadata } from './metadata';

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'bmp', 'webp'];
const AUDIO_TYPES = [
  '3gp', 'aac', 'awb', 'flac', 'imy', 'm4a', 'm4b', 'mid', 'mka', 'mkv', 'mp3', 'mp3package',
  'mp4', 'opus', 'mxmf', 'oga', 'ogg', 'ota', 'rtttl', 'rtx', 'wav', 'webm', 'wma', 'xmf',
];

export interface Entry {
  name: string;
  uri: string;
  isDirectory: boolean;
}

/** One library entry that will become one audiobook, before its files are parsed. */
export interface BookSource {
  id: string;
  name: string;
  isDirectory: boolean;
  audio: Entry[];
  image: Entry | null;
}

export interface ParsedFile {
  entry: Entry;
  metadata: FileMetadata;
}

const extension = (name: string) => name.match(/\.([^/.]+)$/)?.[1]?.toLowerCase() ?? '';
export const isAudio = (name: string) => AUDIO_TYPES.includes(extension(name));
export const isImage = (name: string) => IMAGE_TYPES.includes(extension(name));
const isM4b = (name: string) => extension(name) === 'm4b';

const byName = (a: Entry, b: Entry) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

/**
 * Each immediate child of the library becomes one audiobook: a directory holding audio files,
 * or a single audio file. The first image in a directory is used as fallback cover art.
 */
export function classifyEntries(
  children: Entry[],
  listDirectory: (entry: Entry) => Entry[],
): BookSource[] {
  const sources: BookSource[] = [];
  [...children].sort(byName).forEach((entry) => {
    if (entry.isDirectory) {
      const files = listDirectory(entry).filter((child) => !child.isDirectory).sort(byName);
      const audio = files.filter((file) => isAudio(file.name));
      if (audio.length > 0) {
        sources.push({
          id: entry.uri,
          name: entry.name,
          isDirectory: true,
          audio,
          image: files.find((file) => isImage(file.name)) ?? null,
        });
      }
    } else if (isAudio(entry.name)) {
      sources.push({ id: entry.uri, name: entry.name, isDirectory: false, audio: [entry], image: null });
    }
  });
  return sources;
}

function bookType(source: BookSource): BookType {
  const m4b = source.audio.some((entry) => isM4b(entry.name));
  if (source.isDirectory) {
    return m4b ? 'M4BDIR' : 'MP3DIR';
  }
  return m4b ? 'M4BFILE' : 'MP3FILE';
}

/** Builds the flat chapter list and book totals from the parsed files of one source. */
export function assembleAudiobook(
  source: BookSource,
  files: ParsedFile[],
  coverUri: string | null,
): Audiobook {
  const chapters: Chapter[] = [];
  let totalProgressTime = 0;
  files.forEach(({ entry, metadata }) => {
    const fileChapters = metadata.chapters.length > 0
      ? metadata.chapters
      : [{ title: metadata.trackTitle, startTime: 0, duration: metadata.duration }];
    fileChapters.forEach((chapter) => {
      chapters.push({ ...chapter, uri: entry.uri, totalProgressTime });
      totalProgressTime += chapter.duration;
    });
  });
  const first = files[0].metadata;
  const fallbackTitle = source.isDirectory ? source.name : first.trackTitle || stripExtension(source.name);
  return {
    id: source.id,
    title: first.album || fallbackTitle,
    type: bookType(source),
    duration: totalProgressTime,
    coverUri,
    chapters,
  };
}

function toEntry(item: Directory | File): Entry {
  return { name: item.name, uri: item.uri, isDirectory: item instanceof Directory };
}

function listDirectory(entry: Entry): Entry[] {
  return new Directory(entry.uri).list().map(toEntry);
}

const coverDirectory = () => {
  const dir = new Directory(Paths.document, 'covers');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
};

async function saveCover(source: BookSource, files: ParsedFile[]): Promise<string | null> {
  const picture = files.find(({ metadata }) => metadata.picture)?.metadata.picture;
  if (!picture && !source.image) {
    return null;
  }
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, source.id);
  const ext = picture ? (picture.format.split('/')[1] ?? 'jpg') : extension(source.image!.name);
  // Unique name per scan, so expo-image / Image don't show a stale cached cover after a rescan.
  const cover = new File(coverDirectory(), `${hash}-${Date.now()}.${ext}`);
  if (picture) {
    await cover.write(picture.data);
  } else {
    await new File(source.image!.uri).copy(cover);
  }
  return cover.uri;
}

async function parseSource(source: BookSource): Promise<Audiobook> {
  const files: ParsedFile[] = [];
  // Read sequentially: SAF reads are slow and parallel reads of many files exhaust memory.
  for (const [idx, entry] of source.audio.entries()) {
    const metadata = await readFileMetadata(new File(entry.uri), { withCover: idx === 0 });
    if (metadata.duration <= 0) {
      metadata.duration = await probeDuration(entry.uri);
    }
    files.push({ entry, metadata });
  }
  return assembleAudiobook(source, files, await saveCover(source, files));
}

export interface ScanProgress {
  done: number;
  total: number;
}

/** Scans the library directory. A book that fails to parse is logged and skipped. */
export async function scanLibrary(
  libraryUri: string,
  onProgress: (progress: ScanProgress) => void,
): Promise<Audiobook[]> {
  const sources = classifyEntries(listDirectory({ name: '', uri: libraryUri, isDirectory: true }), listDirectory);
  const books: Audiobook[] = [];
  onProgress({ done: 0, total: sources.length });
  for (const [idx, source] of sources.entries()) {
    try {
      books.push(await parseSource(source));
    } catch (error) {
      console.warn(`Skipping ${source.name}:`, error);
    }
    onProgress({ done: idx + 1, total: sources.length });
  }
  return books;
}

/** Removes cover files no longer referenced by any book. */
export function pruneCovers(books: Audiobook[]) {
  const used = new Set(books.map((book) => book.coverUri));
  coverDirectory()
    .list()
    .forEach((item) => {
      if (item instanceof File && !used.has(item.uri)) {
        item.delete();
      }
    });
}
