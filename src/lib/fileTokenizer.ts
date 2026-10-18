import {
  AbstractTokenizer,
  EndOfStreamError,
  type IRandomAccessFileInfo,
  type IRandomAccessTokenizer,
  type IReadChunkOptions,
} from 'strtok3';

/** The part of expo-file-system's `FileHandle` the tokenizer needs. */
export interface RandomAccessHandle {
  offset: number | null;
  readBytes(length: number): Promise<Uint8Array>;
  close(): void;
}

/**
 * strtok3 tokenizer that reads byte ranges on demand through a file handle, so metadata can
 * be parsed from large audiobook files without loading the whole file into memory.
 */
export class FileHandleTokenizer extends AbstractTokenizer implements IRandomAccessTokenizer {
  fileInfo: IRandomAccessFileInfo;

  private handle: RandomAccessHandle;

  /** `fileInfo.path` (the file name is enough) lets music-metadata pick a parser by extension. */
  constructor(handle: RandomAccessHandle, fileInfo: IRandomAccessFileInfo) {
    super();
    this.handle = handle;
    this.fileInfo = fileInfo;
  }

  supportsRandomAccess(): boolean {
    return true;
  }

  setPosition(position: number): void {
    this.position = position;
  }

  async readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const normalized = this.normalizeOptions(buffer, options);
    const bytesRead = await this.peekBuffer(buffer, normalized);
    this.position = normalized.position + bytesRead;
    return bytesRead;
  }

  async peekBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const { position, length, mayBeLess } = this.normalizeOptions(buffer, options);
    const bytesToRead = Math.max(0, Math.min(this.fileInfo.size - position, length));
    if (!mayBeLess && bytesToRead < length) {
      throw new EndOfStreamError();
    }
    if (bytesToRead === 0) {
      return 0;
    }
    this.handle.offset = position;
    const bytes = await this.handle.readBytes(bytesToRead);
    buffer.set(bytes);
    if (!mayBeLess && bytes.length < length) {
      throw new EndOfStreamError();
    }
    return bytes.length;
  }

  async close(): Promise<void> {
    this.handle.close();
    await super.close();
  }
}
