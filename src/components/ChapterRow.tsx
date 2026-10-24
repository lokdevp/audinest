import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formattedDuration } from '@/lib/format';
import { accentBar, colors, pressedStyle, radius, spacing, type } from '@/theme';
import type { Chapter } from '@/types';

/** Row height plus gap, for `getItemLayout`. */
export const CHAPTER_ROW_HEIGHT = 84;
const GAP = spacing.sm + 2;

export type ChapterState = 'done' | 'current' | 'next' | 'later';

/** State of the chapter at `idx` when the chapter at `current` is playing. */
export function chapterState(idx: number, current: number): ChapterState {
  if (idx < current) return 'done';
  if (idx === current) return 'current';
  return idx === current + 1 ? 'next' : 'later';
}

interface Props {
  chapter: Chapter;
  idx: number;
  state: ChapterState;
  /** Seconds left in the chapter, shown on the current row. */
  remaining: number;
  onPress: (idx: number) => void;
}

const STATUS: Record<ChapterState, string | null> = {
  done: 'Completed',
  current: null,
  next: 'Up next',
  later: null,
};

export const ChapterRow = memo(function ChapterRow({ chapter, idx, state, remaining, onPress }: Props) {
  const current = state === 'current';
  const status = current ? `${formattedDuration(remaining)} remaining` : STATUS[state];
  return (
    <Pressable
      onPress={() => onPress(idx)}
      accessibilityRole="button"
      accessibilityState={{ selected: current }}
      style={({ pressed }) => [styles.row, current && styles.current, pressed && styles.pressed]}
    >
      {current && <View style={styles.accent} />}
      <View style={[styles.lead, current && styles.leadCurrent]}>
        {state === 'done' && <MaterialIcons name="check-circle-outline" size={22} color={colors.primary} />}
        {current && <MaterialIcons name="volume-up" size={20} color={colors.onPrimary} />}
        {(state === 'next' || state === 'later') && <Text style={styles.number}>{idx + 1}</Text>}
      </View>
      <View style={styles.info}>
        <Text style={[styles.label, current && styles.labelCurrent]} numberOfLines={1}>
          {`Chapter ${idx + 1}${current ? ' (current)' : ''}`}
          {status && <Text style={styles.status}>{`  •  ${status}`}</Text>}
        </Text>
        <Text style={[styles.title, current && styles.titleCurrent]} numberOfLines={1}>{chapter.title}</Text>
        <Text style={styles.duration}>{formattedDuration(chapter.duration)}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    height: CHAPTER_ROW_HEIGHT - GAP,
    marginBottom: GAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  current: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.highlightStrong,
  },
  pressed: pressedStyle,
  accent: {
    ...accentBar,
    width: 4,
  },
  lead: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
  },
  leadCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  number: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
  info: {
    flex: 1,
  },
  label: {
    ...type.labelSm,
    color: colors.onSurfaceVariant,
  },
  labelCurrent: {
    color: colors.primary,
  },
  status: {
    fontFamily: type.labelMd.fontFamily,
    textTransform: 'none',
    letterSpacing: 0,
  },
  title: {
    ...type.titleMd,
    color: colors.onSurface,
    marginVertical: 1,
  },
  titleCurrent: {
    color: colors.primary,
  },
  duration: {
    ...type.timer,
    color: colors.onSurfaceVariant,
  },
});
