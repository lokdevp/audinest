import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formattedDuration } from '@/lib/format';
import { colors, radius, spacing, type } from '@/theme';
import type { Audiobook, Position } from '@/types';
import { AudiobookProgress } from './AudiobookProgress';
import { PlayButton } from './ControlButtons';
import { CoverArt } from './CoverArt';

interface Props {
  book: Audiobook;
  position: Position;
  speed: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  onOpen: () => void;
}

/** Large card for the book being listened to. */
export function ResumeCard({ book, position, speed, playing, play, pause, onOpen }: Props) {
  const left = book.duration - position.totalProgressTime;
  // The card opens the player through a layer behind the content, so the play button is its sibling
  // rather than nested in it, and screen readers can reach both. The rest lets touches through to it.
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open ${book.title}`}
        style={({ pressed }) => [styles.opener, pressed && styles.pressed]}
      />
      <View pointerEvents="none">
        <CoverArt uri={book.coverUri} title={book.title} author={book.author} style={styles.cover} fontSize={16} fullTitle />
      </View>
      <View style={styles.info} pointerEvents="box-none">
        <View pointerEvents="none">
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{playing ? 'Playing' : 'In Progress'}</Text>
            </View>
            <Text style={styles.speed}>{speed}×</Text>
          </View>
          <Text style={styles.title} numberOfLines={3}>{book.title}</Text>
        </View>
        <View style={styles.bottom} pointerEvents="box-none">
          <View style={styles.flex} pointerEvents="none">
            <Text style={styles.chapter}>Chapter {position.chapterIdx + 1} of {book.chapters.length}</Text>
            <Text style={styles.left}>{formattedDuration(left)} left</Text>
          </View>
          <View style={styles.ring}>
            <PlayButton playing={playing} play={play} pause={pause} size={48} />
          </View>
        </View>
        <View pointerEvents="none">
          <AudiobookProgress progress={position.totalProgressTime} duration={book.duration} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.margin,
    padding: spacing.md,
    borderRadius: radius.xl + 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    boxShadow: '0 8px 32px rgba(0, 10, 30, 0.6)',
  },
  opener: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.xl + 4,
  },
  pressed: {
    backgroundColor: colors.hairline,
  },
  cover: {
    width: 104,
    height: 156,
    borderRadius: radius.lg,
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerHighest,
  },
  badgeText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  speed: {
    ...type.labelMd,
    fontFamily: type.titleMd.fontFamily,
    color: colors.primary,
  },
  title: {
    ...type.titleLg,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  chapter: {
    ...type.bodyMd,
    color: colors.onSurface,
  },
  left: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
  },
  ring: {
    padding: 3,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
  },
});
