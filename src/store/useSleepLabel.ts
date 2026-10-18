import { useEffect, useState } from 'react';

import { sleepLabel } from '@/lib/sleep';
import { usePlayerState } from './usePlayerState';

/** Label of the running sleep timer, refreshed every second while it counts down; null when off. */
export function useSleepLabel(): string | null {
  const sleep = usePlayerState((state) => state.sleep);
  const [now, setNow] = useState(() => Date.now());
  const ticking = sleep?.kind === 'minutes' && sleep.endsAt !== null;
  useEffect(() => {
    if (!ticking) {
      return undefined;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [ticking]);
  return sleep ? sleepLabel(sleep, now) : null;
}
