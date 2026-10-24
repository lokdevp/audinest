import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formattedTime } from '@/lib/format';
import { isFinished, progressFraction } from '@/lib/position';
import { accentBar, colors, pressedStyle, radius, spacing, type } from '@/theme';
import type { Audiobook, Position } from '@/types';
import { AudiobookProgress } from './AudiobookProgress';
import { CoverArt } from './CoverArt';

interface Props {
  book: Audiobook;
  position: Position | undefined;
  selected: boolean;
  onPress: (id: string) => void;
  onLongPress?: (id: string) => void;
}

export const AudiobookRow = memo(function AudiobookRow({ book, position, selected, onPress, onLongPress }: Props) {
  const elapsed = position?.totalProgressTime ?? 0;
  const percent = Math.floor(progressFraction(elapsed, book.duration) * 100);
  const finished = isFinished(book, position);
  const label = [book.title, book.author, finished ? 'finished' : `${percent}% listened`].filter(Boolean).join(', ');
  return (
    <Pressable
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}
      onPress={() => onPress(book.id)}
      onLongPress={onLongPress && (() => onLongPress(book.id))}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the player"
      // Screen readers can't long-press; this offers the same menu as an action.
      accessibilityActions={onLongPress ? [{ name: 'longpress', label: 'Book options' }] : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress') onLongPress?.(book.id);
      }}
    >
      {selected && <View style={styles.accent} />}
      <CoverArt uri={book.coverUri} title={book.title} style={styles.cover} fontSize={24} />
      <View style={styles.status}>
        <View>
          <Text style={[styles.title, selected && styles.titleSelected]} numberOfLines={2}>
            {book.title}
          </Text>
          {book.author && <Text style={styles.author} numberOfLines={1}>{book.author}</Text>}
        </View>
        <View style={styles.meta}>
          <Text style={styles.time}>{formattedTime(elapsed)} / {formattedTime(book.duration)}</Text>
          <View style={[styles.chip, finished && styles.chipFinished]}>
            <Text style={[styles.chipText, finished && styles.chipTextFinished]}>
              {finished ? 'Finished' : `${percent}%`}
            </Text>
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
    borderColor: colors.highlight,
  },
  pressed: pressedStyle,
  accent: accentBar,
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
  author: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
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
  chipFinished: {
    backgroundColor: colors.primary,
  },
  chipTextFinished: {
    color: colors.onPrimary,
  },
});
