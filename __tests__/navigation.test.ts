import { router } from 'expo-router';

import { goBack, push } from '@/lib/navigation';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => false) },
}));

let now = 0;

beforeEach(() => {
  jest.clearAllMocks();
  // Far past the previous test's last navigation, which the guard remembers.
  now += 60_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

it('ignores a second navigation right after the first, so a double tap opens one screen', () => {
  push('/player');
  push('/player');
  expect(router.push).toHaveBeenCalledTimes(1);

  now += 600;
  push('/chapters');
  expect(router.push).toHaveBeenCalledTimes(2);
});

it('replaces the screen when there is nothing to go back to', () => {
  goBack('/player');
  expect(router.back).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith('/player');
});
