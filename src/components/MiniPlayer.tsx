import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/theme';
import type { Audiobook, Position } from '@/types';
import { AudiobookProgress } from './AudiobookProgress';
import { PlayButton, SKIP_SECONDS, SkipIcon } from './ControlButtons';
import { CoverArt } from './CoverArt';

export const MINI_PLAYER_HEIGHT = 84;

interface Props {
  book: Audiobook;
  position: Position;
  playing: boolean;
  play: () => void;
  pause: () => void;
  skip: (seconds: number) => void;
  onOpen: () => void;
  bottomInset: number;
}

/** Floating now-playing bar at the bottom of the library. */
export function MiniPlayer({ book, position, playing, play, pause, skip, onOpen, bottomInset }: Props) {
  return (
    <View style={[styles.wrapper, { bottom: bottomInset + spacing.sm }]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Now playing: ${book.title}`}
        style={styles.bar}
      >
        <AudiobookProgress progress={position.totalProgressTime} duration={book.duration} style={styles.progress} />
        <View style={styles.row}>
          <CoverArt uri={book.coverUri} title={book.title} style={styles.cover} fontSize={20} />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{book.title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Ch. {position.chapterIdx + 1} of {book.chapters.length}
            </Text>
          </View>
          <Pressable
            onPress={() => skip(SKIP_SECONDS)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Forward ${SKIP_SECONDS} seconds`}
            style={styles.skip}
          >
            <SkipIcon seconds={SKIP_SECONDS} size={28} color={colors.onSurfaceVariant} />
          </Pressable>
          <PlayButton playing={playing} play={play} pause={pause} size={48} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.margin,
    right: spacing.margin,
  },
  bar: {
    height: MINI_PLAYER_HEIGHT,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(17, 31, 57, 0.97)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
  },
  progress: {
    height: 3,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
  },
  info: {
    flex: 1,
  },
  title: {
    ...type.titleMd,
    color: colors.onSurface,
  },
  subtitle: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
  skip: {
    padding: 4,
  },
});
