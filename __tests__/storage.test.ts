import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { asyncStorage, fileStorage } from '@/store/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const mockFiles = new Map<string, string>();

jest.mock('expo-file-system', () => {
  class File {
    path: string;
    constructor(dir: string, name: string) {
      this.path = `${dir}/${name}`;
    }
    get exists() {
      return mockFiles.has(this.path);
    }
    textSync() {
      return mockFiles.get(this.path)!;
    }
    writeSync(content: string) {
      mockFiles.set(this.path, content);
    }
    moveSync(destination: File) {
      mockFiles.set(destination.path, mockFiles.get(this.path)!);
      mockFiles.delete(this.path);
      this.path = destination.path;
    }
    delete() {
      mockFiles.delete(this.path);
    }
  }
  return { File, Paths: { document: 'docs' } };
});

const saved = { state: { books: { a: 1 } }, version: 1 };

beforeEach(() => {
  mockFiles.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('fileStorage', () => {
  it('round-trips through a temp file and leaves only the real one', () => {
    fileStorage!.setItem('library', saved);
    expect([...mockFiles.keys()]).toEqual(['docs/library.json']);
    expect(fileStorage!.getItem('library')).toEqual(saved);
  });

  it('drops a truncated file instead of failing', () => {
    mockFiles.set('docs/library.json', '{"state":{"boo');
    expect(fileStorage!.getItem('library')).toBeNull();
    expect(mockFiles.size).toBe(0);
  });

  it('reads a complete temp file left by a crash during the move', () => {
    mockFiles.set('docs/library.json.tmp', JSON.stringify(saved));
    expect(fileStorage!.getItem('library')).toEqual(saved);
  });

  it('lets a store with a corrupt file finish hydrating', () => {
    mockFiles.set('docs/library.json', 'not json');
    const useStore = create<{ books: Record<string, number> }>()(
      persist(() => ({ books: {} }), { name: 'library', storage: fileStorage, version: 1 }),
    );
    expect(useStore.persist.hasHydrated()).toBe(true);
    expect(useStore.getState().books).toEqual({});
  });
});

describe('asyncStorage', () => {
  it('drops invalid JSON instead of failing', async () => {
    await AsyncStorage.setItem('progress', '{oops');
    await expect(asyncStorage!.getItem('progress')).resolves.toBeNull();
    await new Promise(process.nextTick);
    expect(await AsyncStorage.getItem('progress')).toBeNull();
  });
});
