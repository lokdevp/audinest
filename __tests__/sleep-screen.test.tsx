import { renderRouter, screen } from 'expo-router/testing-library';

import SleepScreen from '@/app/sleep';
import { usePlayerState } from '@/store/usePlayerState';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/audio/playback', () => ({ setSleepTimer: jest.fn() }));

it('marks the running minutes timer as selected', async () => {
  usePlayerState.setState({ sleep: { kind: 'minutes', minutes: 30, endsAt: null, remainingMs: 25 * 60_000 } });
  await renderRouter({ index: () => null, sleep: SleepScreen }, { initialUrl: '/sleep' });
  expect(await screen.findByText('Pausing in 25m')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '30 minutes', selected: true })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Off', selected: false })).toBeOnTheScreen();
});
