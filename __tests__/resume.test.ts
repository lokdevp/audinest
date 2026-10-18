import { rewindSeconds } from '@/lib/resume';

describe('rewindSeconds', () => {
  it('does not rewind after a short pause', () => {
    expect(rewindSeconds(0)).toBe(0);
    expect(rewindSeconds(29_999)).toBe(0);
  });

  it('rewinds further the longer the pause', () => {
    expect(rewindSeconds(30_000)).toBe(5);
    expect(rewindSeconds(5 * 60_000 - 1)).toBe(5);
    expect(rewindSeconds(5 * 60_000)).toBe(15);
    expect(rewindSeconds(60 * 60_000)).toBe(30);
    expect(rewindSeconds(24 * 60 * 60_000)).toBe(30);
  });
});
