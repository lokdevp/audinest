import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import ChaptersScreen from '@/app/chapters';
import { goToChapter } from '@/audio/playback';
import { useLibrary } from '@/store/useLibrary';
import { useProgress } from '@/store/useProgress';
import { singleFileBook } from '../test-utils/books';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///document/' },
  File: class {
    exists = false;
    writeSync() {}
  },
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/audio/playback', () => ({ goToChapter: jest.fn() }));

const book = singleFileBook();

beforeEach(() => {
  useLibrary.setState({ books: { [book.id]: book } });
  useProgress.setState({
    selectedId: book.id,
    positions: { [book.id]: { chapterIdx: 1, currentTime: 30, totalProgressTime: 130 } },
  });
});

it('marks finished, current and upcoming chapters', async () => {
  await renderRouter({ index: () => null, player: () => null, chapters: ChaptersScreen }, { initialUrl: '/chapters' });
  expect(await screen.findByText('Now playing')).toBeOnTheScreen();
  expect(screen.getByText(/Completed/)).toBeOnTheScreen();
  expect(screen.getByText(/2m 0s remaining/)).toBeOnTheScreen();
  expect(screen.getByText(/Up next/)).toBeOnTheScreen();
});

it('jumps to a chapter when its row is tapped', async () => {
  const router = await renderRouter({ index: () => null, player: () => null, chapters: ChaptersScreen }, { initialUrl: '/chapters' });
  fireEvent.press(await screen.findByText('Chapter 3'));
  expect(goToChapter).toHaveBeenCalledWith(2);
  await waitFor(() => expect(router.getPathname()).not.toBe('/chapters'));
});
