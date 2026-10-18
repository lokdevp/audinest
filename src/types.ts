export type BookType = 'M4BFILE' | 'M4BDIR' | 'MP3FILE' | 'MP3DIR';

export interface Chapter {
  title: string;
  /** Audio file this chapter lives in. */
  uri: string;
  /** Offset of the chapter inside its file, in seconds. */
  startTime: number;
  duration: number;
  /** Running offset of the chapter across the whole book, in seconds. */
  totalProgressTime: number;
}

export interface Audiobook {
  /** URI of the library entry (file or directory) the book was built from. */
  id: string;
  title: string;
  /** Album artist or artist tag of the first file. Missing in libraries scanned before it was added. */
  author?: string | null;
  type: BookType;
  duration: number;
  coverUri: string | null;
  chapters: Chapter[];
  /** Names, sizes and modification times of the book's files, to skip unchanged books on a rescan. */
  fingerprint?: string | null;
}

export interface Position {
  chapterIdx: number;
  /** Seconds elapsed inside the current chapter. */
  currentTime: number;
  /** Seconds elapsed inside the whole book. */
  totalProgressTime: number;
}

export type LibrarySort = 'title' | 'recent' | 'progress';

/** Pauses playback after a while (`endsAt` is null while paused) or at the end of the chapter. */
export type SleepTimer =
  | { kind: 'minutes'; endsAt: number | null; remainingMs: number }
  | { kind: 'chapter' };
