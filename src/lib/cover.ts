export interface CoverTint {
  background: string;
  accent: string;
}

/** Muted jacket colours for books without cover art, dark enough for `colors.onSurface` text. */
export const COVER_TINTS: readonly CoverTint[] = [
  { background: '#0f3a44', accent: '#5eead4' }, // teal
  { background: '#3a1f45', accent: '#e9a8f2' }, // plum
  { background: '#1c2c55', accent: '#93b4ff' }, // slate blue
  { background: '#24391f', accent: '#a7d98b' }, // moss
  { background: '#45261a', accent: '#f4a77c' }, // rust
  { background: '#2a2156', accent: '#b7a6ff' }, // indigo
  { background: '#40331a', accent: '#f0cd7a' }, // ochre
  { background: '#45202c', accent: '#f59bb4' }, // rose
];

/** Jacket colours for a book, picked by hashing its title so it stays the same everywhere. */
export function coverTint(title: string): CoverTint {
  let hash = 5381;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) + hash + title.charCodeAt(i)) | 0;
  }
  return COVER_TINTS[Math.abs(hash) % COVER_TINTS.length];
}

const ARTICLES = new Set(['the', 'a', 'an']);

/** Up to two letters for a small placeholder: `The Hobbit` → `HO`, `Project Hail Mary` → `PH`. */
export function coverInitials(title: string): string {
  const all = title.split(/\s+/).map((word) => word.replace(/^[^\p{L}\p{N}]+/u, '')).filter(Boolean);
  const words = all.length > 1 && ARTICLES.has(all[0].toLowerCase()) ? all.slice(1) : all;
  if (words.length === 0) {
    return '?';
  }
  const letters = words.length === 1 ? [...words[0]].slice(0, 2) : [[...words[0]][0], [...words[1]][0]];
  return letters.join('').toUpperCase();
}
