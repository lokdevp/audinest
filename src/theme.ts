import type { TextStyle } from 'react-native';

/** "Glacier" palette from the Stitch design. */
export const colors = {
  surface: '#040e21',
  surfaceContainerLowest: '#010712',
  surfaceContainerLow: '#071328',
  surfaceContainer: '#0c1931',
  surfaceContainerHigh: '#111f39',
  surfaceContainerHighest: '#162541',
  onSurface: '#dce5ff',
  onSurfaceVariant: '#93a4c7',
  outline: '#6b758d',
  outlineVariant: '#3e485e',
  primary: '#7dd3fc',
  primaryContainer: '#38bdf8',
  onPrimary: '#003447',
  hairline: 'rgba(255, 255, 255, 0.06)',
  border: 'rgba(255, 255, 255, 0.1)',
  primaryTint: 'rgba(125, 211, 252, 0.12)',
};

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, margin: 16 };

export const fonts = {
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
};

export const glow = '0 0 24px rgba(125, 211, 252, 0.35)';

export const type = {
  displayMobile: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 38, letterSpacing: -0.45 },
  headlineMobile: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 32, letterSpacing: -0.24 },
  headlineMd: { fontFamily: fonts.serifMedium, fontSize: 22, lineHeight: 28 },
  titleLg: { fontFamily: fonts.sansSemiBold, fontSize: 18, lineHeight: 24 },
  titleMd: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22 },
  bodyMd: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  labelMd: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 16, letterSpacing: 0.26 },
  labelSm: {
    fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.66, textTransform: 'uppercase',
  },
  timer: {
    fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;
