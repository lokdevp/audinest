import { createAudioPlayer } from 'expo-audio';

/**
 * Asks the platform player for a file's duration. Used when the metadata parser can't find one
 * (e.g. a VBR MP3 without a Xing header). Resolves 0 if the file doesn't load within `timeoutMs`.
 */
export function probeDuration(uri: string, timeoutMs = 10000): Promise<number> {
  return new Promise((resolve) => {
    const player = createAudioPlayer({ uri });
    let settled = false;
    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      player.remove();
      resolve(duration);
    };
    const timer = setTimeout(() => finish(0), timeoutMs);
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && status.duration > 0) {
        finish(status.duration);
      }
    });
  });
}
