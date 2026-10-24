import { Alert } from 'react-native';

import { play } from '@/audio/playback';
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
    moveSync() {}
  },
}));
jest.mock('expo', () => ({ isRunningInExpoGo: () => true }));

const mockPlayer = {
  listener: null as ((status: object) => void) | null,
  isLoaded: false,
  currentTime: 0,
  addListener: jest.fn((_event: string, listener: (status: object) => void) => {
    mockPlayer.listener = listener;
  }),
  replace: jest.fn(),
  seekTo: jest.fn(async () => {}),
  setPlaybackRate: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
};
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => mockPlayer,
  setAudioModeAsync: async () => {},
}));

const book = singleFileBook();
const status = (overrides: object) => ({
  playing: false, isLoaded: false, didJustFinish: false, currentTime: 0, error: null, ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  useLibrary.setState({ books: { [book.id]: book } });
  useProgress.setState({ selectedId: book.id, positions: {} });
});

it('shows one alert when the player reports an error, and loads the file again on the next play', async () => {
  await play();
  expect(mockPlayer.replace).toHaveBeenCalledTimes(1);
  mockPlayer.listener!(status({ error: 'Source error' }));
  mockPlayer.listener!(status({ error: 'Source error' }));
  expect(Alert.alert).toHaveBeenCalledTimes(1);

  await play();
  expect(mockPlayer.replace).toHaveBeenCalledTimes(2);
});

it('shows an alert instead of rejecting when loading fails', async () => {
  mockPlayer.seekTo.mockRejectedValueOnce(new Error('gone'));
  await expect(play()).resolves.toBeUndefined();
  expect(Alert.alert).toHaveBeenCalledTimes(1);
});
