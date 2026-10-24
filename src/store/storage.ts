import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { createJSONStorage, type PersistStorage } from 'zustand/middleware';

/**
 * Drops a stored value that can't be read or parsed, so its store starts empty. Without this a corrupt
 * value makes hydration fail, and zustand never marks the store as hydrated.
 */
function recoverable<S>(storage: PersistStorage<S> | undefined): PersistStorage<S> | undefined {
  if (!storage) {
    return undefined;
  }
  return {
    ...storage,
    getItem: (name) => {
      const recover = (error: unknown) => {
        console.warn(`Discarding unreadable stored "${name}"`, error);
        try {
          Promise.resolve(storage.removeItem(name)).catch(() => {});
        } catch {
          // Nothing more to do: the value is ignored either way.
        }
        return null;
      };
      try {
        const value = storage.getItem(name);
        return value instanceof Promise ? value.catch(recover) : value;
      } catch (error) {
        return recover(error);
      }
    },
  };
}

export const asyncStorage = recoverable(createJSONStorage(() => AsyncStorage));

const storeFile = (name: string) => new File(Paths.document, `${name}.json`);
const tempFile = (name: string) => new File(Paths.document, `${name}.json.tmp`);

/**
 * Stores state as a JSON file in the app's document directory. Used for the library, whose
 * chapter lists can outgrow what Android's AsyncStorage can read back in a single value.
 *
 * Writes go to a temp file that is then moved over the real one, so a crash mid-write can't leave a
 * truncated file. The move deletes the old file before renaming, so a lone temp file is a complete write.
 */
export const fileStorage = recoverable(
  createJSONStorage(() => ({
    getItem: (name) => {
      const file = [storeFile(name), tempFile(name)].find((candidate) => candidate.exists);
      return file ? file.textSync() : null;
    },
    setItem: (name, value) => {
      const temp = tempFile(name);
      temp.writeSync(value);
      temp.moveSync(storeFile(name), { overwrite: true });
    },
    removeItem: (name) => {
      for (const file of [storeFile(name), tempFile(name)]) {
        if (file.exists) {
          file.delete();
        }
      }
    },
  })),
);
