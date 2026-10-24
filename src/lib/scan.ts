import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { Audiobook, BookType, Chapter } from '@/types';
import { probeDuration } from '@/audio/probe';
import { readFileMetadata, withDuration, type FileMetadata } from './metadata';
import { extension, naturalCompare, stripExtension } from './names';

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'bmp', 'webp'];
/** Embedded picture types by MIME type. Tags can hold anything, so this also keeps the file name safe. */
const PICTURE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/bmp': 'bmp',
};

/**
 * Part of every fingerprint. Bump it when parsing changes, so the next rescan reads every book again
 * instead of keeping what the old code produced.
 */
const SCAN_VERSION = 2;
const AUDIO_TYPES = [
  '3gp', 'aac', 'awb', 'flac', 'm4a', 'm4b', 'mka', 'mkv', 'mp3', 'mp4', 'opus', 'oga', 'ogg', 'wav',
  'webm', 'wma',
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

// Hidden files, such as the `._name.mp3` files macOS leaves on copied folders, aren't audio.
const isHidden = (name: string) => name.startsWith('.');
export const isAudio = (name: string) => !isHidden(name) && AUDIO_TYPES.includes(extension(name));
export const isImage = (name: string) => !isHidden(name) && IMAGE_TYPES.includes(extension(name));
const isM4b = (name: string) => extension(name) === 'm4b';

const byName = (a: Entry, b: Entry) => naturalCompare(a.name, b.name);

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
    author: first.author,
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

/** Saves the book's cover, or returns null if it has none or it can't be saved. */
async function saveCover(source: BookSource, files: ParsedFile[]): Promise<string | null> {
  const picture = files.find(({ metadata }) => metadata.picture)?.metadata.picture;
  if (!picture && !source.image) {
    return null;
  }
  try {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, source.id);
    const ext = picture ? (PICTURE_EXTENSIONS[picture.format.toLowerCase()] ?? 'jpg') : extension(source.image!.name);
    // Unique name per scan, so expo-image / Image don't show a stale cached cover after a rescan.
    const cover = new File(coverDirectory(), `${hash}-${Date.now()}.${ext}`);
    if (picture) {
      await cover.write(picture.data);
    } else {
      await new File(source.image!.uri).copy(cover);
    }
    return cover.uri;
  } catch (error) {
    console.warn(`Can't save the cover of ${source.name}:`, error);
    return null;
  }
}

export interface FileStamp {
  name: string;
  size: number | undefined;
  modificationTime: number | undefined;
}

/** Identifies the current version of a book's files, or null when a size or time is unknown. */
export function sourceFingerprint(stamps: FileStamp[]): string | null {
  if (stamps.some(({ size, modificationTime }) => size === undefined || modificationTime === undefined)) {
    return null;
  }
  const files = stamps.map(({ name, size, modificationTime }) => `${name}:${size}:${modificationTime}`);
  return [`v${SCAN_VERSION}`, ...files].join('|');
}

function stamp(entry: Entry): FileStamp {
  try {
    const { size, modificationTime } = new File(entry.uri).info();
    return { name: entry.name, size, modificationTime };
  } catch {
    return { name: entry.name, size: undefined, modificationTime: undefined };
  }
}

/** A cheap query per file: no file contents are read. */
function fingerprintSource(source: BookSource): string | null {
  return sourceFingerprint([...source.audio, ...(source.image ? [source.image] : [])].map(stamp));
}

/** A previously scanned book can be kept if its files are unchanged and its cover is still there. */
function reusable(previous: Audiobook | undefined, fingerprint: string | null): previous is Audiobook {
  return Boolean(
    previous && fingerprint && previous.fingerprint === fingerprint &&
      (!previous.coverUri || new File(previous.coverUri).exists),
  );
}

/**
 * Reads one file's metadata. If its tags can't be read (a format music-metadata doesn't know, or a
 * damaged file), the platform player is asked for its duration. Returns null if it can't play it either.
 */
async function parseFile(entry: Entry, withCover: boolean): Promise<FileMetadata | null> {
  let metadata: FileMetadata;
  let tagsRead = true;
  try {
    metadata = await readFileMetadata(new File(entry.uri), { withCover });
  } catch (error) {
    console.warn(`Can't read the tags of ${entry.name}:`, error);
    tagsRead = false;
    metadata = {
      album: null, author: null, trackTitle: stripExtension(entry.name), duration: 0, chapters: [], picture: null,
    };
  }
  if (metadata.duration <= 0) {
    metadata = withDuration(metadata, await probeDuration(entry.uri));
  }
  return tagsRead || metadata.duration > 0 ? metadata : null;
}

async function parseSource(source: BookSource): Promise<Audiobook> {
  const files: ParsedFile[] = [];
  // Read sequentially: SAF reads are slow and parallel reads of many files exhaust memory.
  for (const entry of source.audio) {
    const metadata = await parseFile(entry, files.length === 0);
    if (metadata) {
      files.push({ entry, metadata });
    } else {
      console.warn(`Skipping unreadable file ${entry.name}`);
    }
  }
  if (files.length === 0) {
    throw new Error('No readable audio files');
  }
  return assembleAudiobook(source, files, await saveCover(source, files));
}

export interface ScanProgress {
  /** Listing the book folders, then reading the books. */
  phase: 'listing' | 'reading';
  done: number;
  total: number;
}

/** Lets React render (progress, taps) between the synchronous file system calls of a scan. */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Scans the library directory. Books in `previous` whose files haven't changed are reused without
 * reading their files, unless `full` is set. A book whose folder can't be listed or that fails to
 * parse keeps its previous version (so its progress isn't lost to a temporary read error), or is
 * skipped if it is new.
 */
export async function scanLibrary(
  libraryUri: string,
  onProgress: (progress: ScanProgress) => void,
  previous: Record<string, Audiobook> = {},
  { full = false } = {},
): Promise<Audiobook[]> {
  const children = listDirectory({ name: '', uri: libraryUri, isDirectory: true });
  const folders = children.filter((child) => child.isDirectory);
  const listings = new Map<string, Entry[]>();
  const unlisted: string[] = [];
  for (const [idx, folder] of folders.entries()) {
    onProgress({ phase: 'listing', done: idx, total: folders.length });
    await yieldToUi();
    try {
      listings.set(folder.uri, listDirectory(folder));
    } catch (error) {
      console.warn(`Can't list ${folder.name}:`, error);
      unlisted.push(folder.uri);
    }
  }
  const sources = classifyEntries(children, (entry) => listings.get(entry.uri) ?? []);
  const books: Audiobook[] = [];
  for (const [idx, source] of sources.entries()) {
    onProgress({ phase: 'reading', done: idx, total: sources.length });
    await yieldToUi();
    const known = previous[source.id];
    try {
      const fingerprint = fingerprintSource(source);
      books.push(!full && reusable(known, fingerprint) ? known : { ...(await parseSource(source)), fingerprint });
    } catch (error) {
      console.warn(`Can't read ${source.name}:`, error);
      if (known) {
        books.push(known);
      }
    }
  }
  // A folder that couldn't be listed keeps its previous book too.
  unlisted.forEach((id) => previous[id] && books.push(previous[id]));
  return books;
}

/** Removes cover files no longer referenced by any book. Failures are only logged: it is cleanup. */
export function pruneCovers(books: Audiobook[]) {
  // By file name: covers are compared with URIs saved earlier, whose format could differ.
  const used = new Set(books.flatMap((book) => (book.coverUri ? [book.coverUri.split('/').pop()] : [])));
  try {
    coverDirectory().list().forEach((item) => {
      if (item instanceof File && !used.has(item.name)) {
        try {
          item.delete();
        } catch (error) {
          console.warn(`Can't delete the cover ${item.name}:`, error);
        }
      }
    });
  } catch (error) {
    console.warn("Can't clean up covers:", error);
  }
}
