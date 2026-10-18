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
  type: BookType;
  duration: number;
  coverUri: string | null;
  chapters: Chapter[];
}

export interface Position {
  chapterIdx: number;
  /** Seconds elapsed inside the current chapter. */
  currentTime: number;
  /** Seconds elapsed inside the whole book. */
  totalProgressTime: number;
}
