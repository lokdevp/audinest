import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { createJSONStorage } from 'zustand/middleware';

export const asyncStorage = createJSONStorage(() => AsyncStorage);

const storeFile = (name: string) => new File(Paths.document, `${name}.json`);

/**
 * Stores state as a JSON file in the app's document directory. Used for the library, whose
 * chapter lists can outgrow what Android's AsyncStorage can read back in a single value.
 */
export const fileStorage = createJSONStorage(() => ({
  getItem: (name) => {
    const file = storeFile(name);
    return file.exists ? file.textSync() : null;
  },
  setItem: (name, value) => storeFile(name).writeSync(value),
  removeItem: (name) => {
    const file = storeFile(name);
    if (file.exists) {
      file.delete();
    }
  },
}));
