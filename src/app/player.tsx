import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  next, pause, play, prev, seekInChapter, setSpeed, skip, undoJump,
} from '@/audio/playback';
import { IconButton, PlayButton, SkipButton } from '@/components/ControlButtons';
import { CoverArt } from '@/components/CoverArt';
import { Pill } from '@/components/Pill';
import { SliderControl } from '@/components/SliderControl';
import { SpeedButton } from '@/components/SpeedButton';
import { formattedTime } from '@/lib/format';
import { usePlayerState } from '@/store/usePlayerState';
import { useBookSpeed, useSelectedBook } from '@/store/useSelectedBook';
import { useSettings } from '@/store/useSettings';
import { useSleepLabel } from '@/store/useSleepLabel';
import { colors, radius, spacing, type } from '@/theme';

const openChapters = () => router.push('/chapters');
const openSleep = () => router.push('/sleep');

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { book, position } = useSelectedBook();
  const speed = useBookSpeed(book?.id);
  const playing = usePlayerState((state) => state.playing);
  const undo = usePlayerState((state) => state.undo);
  const sleepLabel = useSleepLabel();
  const skipBack = useSettings((state) => state.skipBack);
  const skipForward = useSettings((state) => state.skipForward);

  if (!book) {
    return <Redirect href="/" />;
  }
  const chapter = book.chapters[position.chapterIdx];
  const chapterLabel = `Chapter ${position.chapterIdx + 1} of ${book.chapters.length}`;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{chapterLabel}</Text>
        <Text style={styles.chapterTitle} numberOfLines={2}>{chapter.title}</Text>
        <Text style={styles.bookTitle} numberOfLines={1}>
          {book.author ? `${book.title} · ${book.author}` : book.title}
        </Text>
      </View>

      <View style={styles.coverArea}>
        <CoverArt uri={book.coverUri} title={book.title} author={book.author} style={styles.cover} fontSize={32} fullTitle />
      </View>

      <View style={styles.card}>
        <Pressable onPress={openChapters} hitSlop={8} style={styles.cardHeader} accessibilityRole="button">
          <MaterialIcons name="format-list-numbered" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.cardHeaderText}>{chapterLabel}</Text>
          <Text style={styles.cardHeaderLink}>All chapters</Text>
        </Pressable>
        <SliderControl currentTime={position.currentTime} duration={chapter.duration} onSeek={seekInChapter} />
      </View>

      <View style={styles.undo}>
        {undo?.bookId === book.id && (
          <Pill
            label={`Back to ${formattedTime(undo.position.totalProgressTime)}`}
            onPress={undoJump}
            icon={<MaterialIcons name="undo" size={18} color={colors.primary} />}
          />
        )}
      </View>

      <View style={styles.controls}>
        <IconButton name="skip-previous" onPress={prev} label="Previous chapter" />
        <SkipButton seconds={-skipBack} onPress={() => skip(-skipBack)} />
        <PlayButton playing={playing} play={play} pause={pause} />
        <SkipButton seconds={skipForward} onPress={() => skip(skipForward)} />
        <IconButton name="skip-next" onPress={next} label="Next chapter" />
      </View>

      <View style={[styles.card, styles.tray]}>
        <SpeedButton speed={speed} onChange={setSpeed} />
        <Pill
          label={sleepLabel ?? 'Sleep'}
          onPress={openSleep}
          accessibilityLabel="Sleep timer"
          icon={<MaterialIcons name="bedtime" size={18} color={colors.primary} />}
        />
        <Pill
          label="Chapters"
          onPress={openChapters}
          icon={<MaterialIcons name="format-list-bulleted" size={18} color={colors.primary} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.margin,
    backgroundColor: colors.surface,
  },
  heading: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  eyebrow: {
    ...type.labelSm,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  chapterTitle: {
    ...type.displayMobile,
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  bookTitle: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  coverArea: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  cover: {
    height: '100%',
    maxHeight: 320,
    aspectRatio: 1,
    borderRadius: radius.xl,
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceContainerLow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  cardHeaderText: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  cardHeaderLink: {
    ...type.labelMd,
    color: colors.primary,
  },
  undo: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginTop: spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  tray: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
  },
});
