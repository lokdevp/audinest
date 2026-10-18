import { renderRouter, screen } from 'expo-router/testing-library';

import LibraryScreen from '@/app/index';
import { useLibrary } from '@/store/useLibrary';
import { useProgress } from '@/store/useProgress';
import { singleFileBook } from '../test-utils/books';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-audio', () => ({}));
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///document/' },
  File: class {
    exists = false;
    writeSync() {}
  },
}));
jest.mock('expo-crypto', () => ({}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

it('shows the empty state when no library has been scanned', async () => {
  await renderRouter({ index: LibraryScreen });
  expect(await screen.findByText('No audiobooks yet.')).toBeOnTheScreen();
  expect(screen.getByText('Choose your audiobook folder')).toBeOnTheScreen();
});

it('shows the resume card and mini-player for the selected book', async () => {
  const book = singleFileBook();
  useLibrary.setState({ books: { [book.id]: book } });
  useProgress.setState({
    selectedId: book.id,
    positions: { [book.id]: { chapterIdx: 1, currentTime: 30, totalProgressTime: 130 } },
  });
  await renderRouter({ index: LibraryScreen });
  expect(await screen.findByText('Continue listening')).toBeOnTheScreen();
  expect(screen.getByText('Chapter 2 of 3')).toBeOnTheScreen();
  expect(screen.getByText('2m 50s left')).toBeOnTheScreen();
  expect(screen.getByLabelText(`Now playing: ${book.title}`)).toBeOnTheScreen();
  expect(screen.getByText('Ch. 2 of 3')).toBeOnTheScreen();
});
