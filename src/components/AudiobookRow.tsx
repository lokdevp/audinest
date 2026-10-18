import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formattedTime } from '@/lib/format';
import { colors, radius, spacing, type } from '@/theme';
import type { Audiobook, Position } from '@/types';
import { AudiobookProgress } from './AudiobookProgress';
import { CoverArt } from './CoverArt';

interface Props {
  book: Audiobook;
  position: Position | undefined;
  selected: boolean;
  onPress: (id: string) => void;
}

export const AudiobookRow = memo(function AudiobookRow({ book, position, selected, onPress }: Props) {
  const elapsed = position?.totalProgressTime ?? 0;
  const percent = book.duration > 0 ? Math.floor(Math.min(100, (elapsed / book.duration) * 100)) : 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}
      onPress={() => onPress(book.id)}
    >
      {selected && <View style={styles.accent} />}
      <CoverArt uri={book.coverUri} title={book.title} style={styles.cover} fontSize={28} />
      <View style={styles.status}>
        <Text style={[styles.title, selected && styles.titleSelected]} numberOfLines={2}>
          {book.title}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{formattedTime(elapsed)} / {formattedTime(book.duration)}</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{percent}%</Text>
          </View>
        </View>
        <AudiobookProgress progress={elapsed} duration={book.duration} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.margin,
    marginBottom: spacing.sm + 4,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  selected: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: 'rgba(125, 211, 252, 0.25)',
  },
  pressed: {
    opacity: 0.8,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  cover: {
    width: 64,
    height: 88,
    borderRadius: radius.md,
  },
  status: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  title: {
    ...type.titleMd,
    color: colors.onSurface,
  },
  titleSelected: {
    color: colors.primary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  time: {
    ...type.timer,
    color: colors.onSurfaceVariant,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHighest,
  },
  chipText: {
    ...type.labelSm,
    color: colors.onSurface,
  },
});
