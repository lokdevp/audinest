import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { progressFraction } from '@/lib/position';
import { colors, radius } from '@/theme';

interface Props {
  progress: number;
  duration: number;
  style?: StyleProp<ViewStyle>;
}

/** Thin rounded progress track. */
export function AudiobookProgress({ progress, duration, style }: Props) {
  const percent = progressFraction(progress, duration) * 100;
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
