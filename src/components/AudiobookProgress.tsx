import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

interface Props {
  progress: number;
  duration: number;
  style?: StyleProp<ViewStyle>;
}

/** Thin rounded progress track. */
export function AudiobookProgress({ progress, duration, style }: Props) {
  const percent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  return (
    <View style={[styles.outer, style]}>
      <View style={[styles.inner, { width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  inner: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
