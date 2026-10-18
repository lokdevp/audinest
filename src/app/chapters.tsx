import { Redirect, router } from 'expo-router';
import { useCallback, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goToChapter } from '@/audio/playback';
import { AudiobookProgress } from '@/components/AudiobookProgress';
import { CHAPTER_ROW_HEIGHT, ChapterRow, type ChapterState } from '@/components/ChapterRow';
import { CoverArt } from '@/components/CoverArt';
import { formattedDuration } from '@/lib/format';
import { useSelectedBook } from '@/store/useSelectedBook';
import { colors, radius, spacing, type } from '@/theme';

function chapterState(idx: number, current: number): ChapterState {
  if (idx < current) return 'done';
  if (idx === current) return 'current';
  return idx === current + 1 ? 'next' : 'later';
}

export default function ChaptersScreen() {
  const insets = useSafeAreaInsets();
  const { book, position } = useSelectedBook();
  const list = useRef<FlatList>(null);
  const scrolled = useRef(false);

  const select = useCallback((idx: number) => {
    goToChapter(idx);
    if (router.canGoBack()) router.back();
    else router.replace('/player');
  }, []);

  if (!book) {
    return <Redirect href="/" />;
  }
  const current = position.chapterIdx;
  const chapter = book.chapters[current];

  // Once the header has a height, bring the current chapter into view (one row above it stays visible).
  const scrollToCurrent = (headerHeight: number) => {
    if (scrolled.current || current < 2) return;
    scrolled.current = true;
    const offset = headerHeight + (current - 1) * CHAPTER_ROW_HEIGHT;
    requestAnimationFrame(() => list.current?.scrollToOffset({ offset, animated: false }));
  };

  const header = (
    <View onLayout={(event) => scrollToCurrent(event.nativeEvent.layout.height)}>
      <View style={styles.bookCard}>
        <CoverArt uri={book.coverUri} title={book.title} style={styles.cover} fontSize={24} />
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>{book.chapters.length} chapters</Text>
          <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
          <Text style={styles.total}>{formattedDuration(book.duration)} total</Text>
        </View>
      </View>

      <View style={styles.nowCard}>
        <AudiobookProgress progress={position.currentTime} duration={chapter.duration} style={styles.nowProgress} />
        <View style={styles.nowBadges}>
          <View style={styles.nowPill}>
            <View style={styles.dot} />
            <Text style={styles.nowPillText}>Now playing</Text>
          </View>
          <Text style={styles.nowOf}>Ch. {current + 1} of {book.chapters.length}</Text>
        </View>
        <Text style={styles.nowTitle} numberOfLines={2}>{chapter.title}</Text>
        <Text style={styles.nowMeta}>
          <Text style={styles.nowPlayed}>{formattedDuration(position.currentTime)} played</Text>
          {`  •  ${formattedDuration(chapter.duration)} total`}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>All chapters</Text>
    </View>
  );

  return (
    <FlatList
      ref={list}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
      data={book.chapters}
      // Chapter titles aren't unique, so the index is the key.
      keyExtractor={(_, idx) => String(idx)}
      ListHeaderComponent={header}
      initialNumToRender={Math.max(10, current + 6)}
      renderItem={({ item, index }) => (
        <ChapterRow
          chapter={item}
          idx={index}
          state={chapterState(index, current)}
          remaining={item.duration - position.currentTime}
          onPress={select}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: spacing.margin,
  },
  flex: {
    flex: 1,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceContainerLow,
  },
  cover: {
    width: 64,
    height: 88,
    borderRadius: radius.md,
  },
  eyebrow: {
    ...type.labelSm,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  bookTitle: {
    ...type.headlineMobile,
    color: colors.onSurface,
    marginVertical: 2,
  },
  total: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
  },
  nowCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    paddingTop: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.25)',
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  nowProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
  },
  nowBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.3)',
    backgroundColor: colors.primaryTint,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  nowPillText: {
    ...type.labelSm,
    color: colors.primary,
  },
  nowOf: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
  nowTitle: {
    ...type.displayMobile,
    color: colors.onSurface,
    marginTop: spacing.sm + 4,
  },
  nowMeta: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  nowPlayed: {
    color: colors.primary,
  },
  sectionLabel: {
    ...type.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 4,
  },
});
