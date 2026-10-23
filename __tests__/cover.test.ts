import { COVER_TINTS, coverInitials, coverTint } from '@/lib/cover';

describe('coverTint', () => {
  it('always gives the same tint for a title', () => {
    expect(coverTint('The Hobbit')).toBe(coverTint('The Hobbit'));
    expect(COVER_TINTS).toContain(coverTint(''));
  });

  it('spreads titles across the palette', () => {
    const titles = Array.from({ length: 40 }, (_, i) => `Book ${i}`);
    expect(new Set(titles.map(coverTint)).size).toBeGreaterThan(4);
  });
});

describe('coverInitials', () => {
  it('skips a leading article', () => {
    expect(coverInitials('The Hobbit')).toBe('HO');
    expect(coverInitials('A Wizard of Earthsea')).toBe('WO');
  });

  it('uses the first letters of the first two words', () => {
    expect(coverInitials('Project Hail Mary')).toBe('PH');
    expect(coverInitials('dune messiah')).toBe('DM');
  });

  it('keeps a one-word article title', () => {
    expect(coverInitials('The')).toBe('TH');
  });

  it('ignores leading punctuation', () => {
    expect(coverInitials('"Surely You\'re Joking"')).toBe('SY');
    expect(coverInitials('1984')).toBe('19');
  });

  it('falls back for empty titles', () => {
    expect(coverInitials('')).toBe('?');
    expect(coverInitials('  -- ')).toBe('?');
  });
});
