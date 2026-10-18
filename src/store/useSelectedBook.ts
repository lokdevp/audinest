import { initialPosition } from '@/lib/position';
import { useLibrary } from './useLibrary';
import { useProgress } from './useProgress';

// Stable fallback: a zustand selector must not return a new object on every call.
const START = initialPosition();

/** The selected book and its position, if a book is selected and still in the library. */
export function useSelectedBook() {
  const selectedId = useProgress((state) => state.selectedId);
  const position = useProgress((state) => (selectedId && state.positions[selectedId]) || START);
  const book = useLibrary((state) => (selectedId ? state.books[selectedId] : undefined));
  return { book, position };
}

/** Playback speed of a book, falling back to the default speed. */
export function useBookSpeed(id: string | undefined) {
  return useProgress((state) => (id && state.speeds[id]) || state.speed);
}
