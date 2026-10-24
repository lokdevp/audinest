import { router, type Href } from 'expo-router';

/** Navigations closer together than this are treated as a double tap. */
const DOUBLE_TAP_MS = 500;
let lastNavigation = 0;

function once(navigate: () => void) {
  const now = Date.now();
  if (now - lastNavigation < DOUBLE_TAP_MS) {
    return;
  }
  lastNavigation = now;
  navigate();
}

/** Opens a screen. A second call right after is ignored, so a double tap doesn't open it twice. */
export const push = (href: Href) => once(() => router.push(href));

/** Goes back, or to `fallback` if there is no screen to go back to (a deep link). Ignores double taps. */
export const goBack = (fallback: Href = '/') =>
  once(() => (router.canGoBack() ? router.back() : router.replace(fallback)));
