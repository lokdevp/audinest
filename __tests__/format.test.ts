import { folderLabel, formattedDuration, formattedTime } from '@/lib/format';

describe('formattedTime', () => {
  it('formats minutes and seconds', () => {
    expect(formattedTime(0)).toBe('00:00');
    expect(formattedTime(65.7)).toBe('01:05');
  });

  it('adds hours for long books', () => {
    expect(formattedTime(3600)).toBe('1:00:00');
    expect(formattedTime(12 * 3600 + 5 * 60 + 9)).toBe('12:05:09');
  });

  it('returns an empty string for missing values', () => {
    expect(formattedTime(undefined)).toBe('');
    expect(formattedTime(NaN)).toBe('');
  });
});

describe('formattedDuration', () => {
  it('uses hours and minutes for long durations', () => {
    expect(formattedDuration(2 * 3600 + 14 * 60 + 59)).toBe('2h 14m');
    expect(formattedDuration(3600)).toBe('1h 0m');
  });

  it('uses minutes and seconds under an hour', () => {
    expect(formattedDuration(34 * 60 + 12.8)).toBe('34m 12s');
    expect(formattedDuration(45)).toBe('45s');
  });

  it('treats missing or negative values as zero', () => {
    expect(formattedDuration(NaN)).toBe('0s');
    expect(formattedDuration(-5)).toBe('0s');
  });
});

describe('folderLabel', () => {
  const tree = 'content://com.android.externalstorage.documents/tree/';

  it('names internal storage and joins the path', () => {
    expect(folderLabel(`${tree}primary%3AAudiobooks`)).toBe('Internal storage › Audiobooks');
    expect(folderLabel(`${tree}primary%3AAudiobooks%2FKids`)).toBe('Internal storage › Audiobooks › Kids');
    expect(folderLabel(`${tree}primary:Audiobooks/`)).toBe('Internal storage › Audiobooks');
  });

  it('ignores a document part', () => {
    expect(folderLabel(`${tree}primary%3AAudiobooks/document/primary%3AAudiobooks%2FDune`))
      .toBe('Internal storage › Audiobooks');
  });

  it('shows only the volume for its root', () => {
    expect(folderLabel(`${tree}primary%3A`)).toBe('Internal storage');
  });

  it('names SD cards and the Documents root', () => {
    expect(folderLabel(`${tree}1A2B-3C4D%3ABooks`)).toBe('SD card › Books');
    expect(folderLabel(`${tree}home%3AAudio`)).toBe('Documents › Audio');
  });

  it('falls back for other providers and plain strings', () => {
    expect(folderLabel('content://com.android.providers.downloads.documents/tree/downloads')).toBe('downloads');
    expect(folderLabel('file:///sdcard/My%20Books')).toBe('file:///sdcard/My Books');
  });
});
