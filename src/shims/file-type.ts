/**
 * Stand-in for the `file-type` package, aliased in metro.config.js and jest.config.js.
 * music-metadata only calls it when a file's MIME type and extension are both unknown.
 * The real package contains a non-literal `import()` that Hermes can't compile, and this
 * app only needs the audio containers.
 */
interface FileTypeResult {
  ext: string;
  mime: string;
}

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const isMpegFrameSync = (bytes: Uint8Array, offset: number) =>
  bytes[offset] === 0xff && (bytes[offset + 1] & 0xe0) === 0xe0;

export async function fileTypeFromBuffer(
  input: Uint8Array | ArrayBuffer,
  options?: { mpegOffsetTolerance?: number },
): Promise<FileTypeResult | undefined> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (ascii(bytes, 0, 3) === 'ID3') return { ext: 'mp3', mime: 'audio/mpeg' };
  if (ascii(bytes, 4, 4) === 'ftyp') return { ext: 'm4a', mime: 'audio/mp4' };
  if (ascii(bytes, 0, 4) === 'fLaC') return { ext: 'flac', mime: 'audio/flac' };
  if (ascii(bytes, 0, 4) === 'OggS') return { ext: 'ogg', mime: 'audio/ogg' };
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return { ext: 'wav', mime: 'audio/wav' };
  if (ascii(bytes, 0, 4) === 'FORM' && ascii(bytes, 8, 3) === 'AIF') return { ext: 'aif', mime: 'audio/aiff' };
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { ext: 'mka', mime: 'audio/matroska' };
  }
  if (bytes[0] === 0x30 && bytes[1] === 0x26 && bytes[2] === 0xb2 && bytes[3] === 0x75) {
    return { ext: 'wma', mime: 'audio/ms-wma' };
  }
  const tolerance = options?.mpegOffsetTolerance ?? 0;
  for (let offset = 0; offset <= tolerance && offset + 1 < bytes.length; offset += 1) {
    if (isMpegFrameSync(bytes, offset)) return { ext: 'mp3', mime: 'audio/mpeg' };
  }
  return undefined;
}
