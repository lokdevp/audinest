import { Alert } from 'react-native';

import { play, skip, stop } from '@/audio/playback';
import { useLibrary } from '@/store/useLibrary';
import { usePlayerState } from '@/store/usePlayerState';
import { useProgress } from '@/store/useProgress';
import type { Audiobook, Position } from '@/types';
import { multiFileBook, singleFileBook } from '../test-utils/books';

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
  clearLockScreenControls: jest.fn(),
};
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => mockPlayer,
  setAudioModeAsync: async () => {},
}));

const book = singleFileBook();
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const at = (chapterIdx: number, currentTime: number, totalProgressTime: number): Position =>
  ({ chapterIdx, currentTime, totalProgressTime });
const select = (selected: Audiobook, position: Position, pausedAt: Record<string, number> = {}) => {
  stop();
  useLibrary.setState({ books: { [selected.id]: selected } });
  useProgress.setState({ selectedId: selected.id, positions: { [selected.id]: position }, pausedAt });
};
const savedPosition = () => useProgress.getState().positions.book;
const status = (overrides: object) => ({
  playing: false, isLoaded: false, didJustFinish: false, currentTime: 0, error: null, ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  useLibrary.setState({ books: { [book.id]: book } });
  useProgress.setState({ selectedId: book.id, positions: {} });
  usePlayerState.setState({ playing: false, sleep: null });
  mockPlayer.seekTo.mockImplementation(async () => {});
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

describe('skip', () => {
  // multiFileBook: 1.mp3 holds chapters 1 (0-60) and 2 (60-100), 2.mp3 holds chapter 3 (100-220 in the book).
  it('goes back into the previous file', () => {
    select(multiFileBook(), at(2, 5, 105));
    skip(-20);
    expect(savedPosition()).toEqual(at(1, 25, 85));
  });

  it('goes forward into the next file', () => {
    select(multiFileBook(), at(1, 30, 90));
    skip(30);
    expect(savedPosition()).toEqual(at(2, 20, 120));
  });

  it('cancels a pending rewind on resume', () => {
    select(multiFileBook(), at(0, 30, 30), { book: Date.now() - 60_000 });
    skip(10);
    expect(useProgress.getState().pausedAt).toEqual({});
  });
});

describe('rewind on resume', () => {
  it('rewinds after a pause, but not past the start of the chapter', async () => {
    select(multiFileBook(), at(2, 3, 103), { book: Date.now() - 10 * 60_000 });
    await play();
    expect(savedPosition()).toEqual(at(2, 0, 100));
    expect(mockPlayer.seekTo).toHaveBeenLastCalledWith(0);
    expect(useProgress.getState().pausedAt).toEqual({});
  });

  it('remembers when a book was paused', async () => {
    select(multiFileBook(), at(0, 30, 30));
    await play();
    mockPlayer.listener!(status({ playing: true, isLoaded: true, currentTime: 30 }));
    mockPlayer.listener!(status({ playing: false, isLoaded: true, currentTime: 30 }));
    expect(useProgress.getState().pausedAt.book).toBeGreaterThan(0);
  });
});

it('does not start playing a book after stop() while it was still loading', async () => {
  select(multiFileBook(), at(0, 30, 30));
  let seeked = () => {};
  mockPlayer.seekTo.mockImplementationOnce(() => new Promise<void>((resolve) => {
    seeked = resolve;
  }));
  const playing = play();
  await flush();
  stop();
  seeked();
  await playing;
  expect(mockPlayer.play).not.toHaveBeenCalled();
});

it('pauses at the end of a file when the sleep timer is set to the end of the chapter', async () => {
  select(multiFileBook(), at(1, 30, 90));
  await play();
  usePlayerState.setState({ sleep: { kind: 'chapter' } });
  mockPlayer.play.mockClear();
  mockPlayer.pause.mockClear();

  mockPlayer.listener!(status({ didJustFinish: true }));
  await flush();
  expect(mockPlayer.pause).toHaveBeenCalled();
  expect(mockPlayer.replace).toHaveBeenLastCalledWith({ uri: '2.mp3' });
  expect(mockPlayer.play).not.toHaveBeenCalled();
  expect(savedPosition()).toEqual(at(2, 0, 100));
});
