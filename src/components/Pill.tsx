import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, type } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  accessibilityLabel?: string;
  /** Filled with the primary colour instead of the outlined surface style. */
  filled?: boolean;
}

export function Pill({ label, onPress, icon, accessibilityLabel, filled = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.pill, filled && styles.filled, pressed && styles.pressed]}
    >
      {icon}
      <Text style={[styles.label, filled && styles.labelFilled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
  },
  filled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    ...type.labelMd,
    fontFamily: type.titleMd.fontFamily,
    color: colors.onSurface,
  },
  labelFilled: {
    color: colors.onPrimary,
  },
});
