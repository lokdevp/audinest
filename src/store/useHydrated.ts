import { useEffect, useState } from 'react';

import { useLibrary } from './useLibrary';
import { useProgress } from './useProgress';

const isHydrated = () => useLibrary.persist.hasHydrated() && useProgress.persist.hasHydrated();

/** True once both persisted stores have been restored from AsyncStorage. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(isHydrated);
  useEffect(() => {
    const check = () => setHydrated(isHydrated());
    const unsubscribers = [
      useLibrary.persist.onFinishHydration(check),
      useProgress.persist.onFinishHydration(check),
    ];
    check();
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);
  return hydrated;
}
