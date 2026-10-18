import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { markFinished, pause, play, resetProgress, selectBook, skip } from '@/audio/playback';
import { AudiobookRow } from '@/components/AudiobookRow';
import { MINI_PLAYER_HEIGHT, MiniPlayer } from '@/components/MiniPlayer';
import { Pill } from '@/components/Pill';
import { ResumeCard } from '@/components/ResumeCard';
import { LIBRARY_SORTS, sortBooks } from '@/lib/library';
import { isFinished } from '@/lib/position';
import { useLibrary } from '@/store/useLibrary';
import { usePlayerState } from '@/store/usePlayerState';
import { useProgress } from '@/store/useProgress';
import { useBookSpeed, useSelectedBook } from '@/store/useSelectedBook';
import { useSettings } from '@/store/useSettings';
import { colors, fonts, spacing, type } from '@/theme';

const openPlayer = () => router.push('/player');
const openMenu = () => router.push('/menu');

/** Long press on a book: mark it finished, or start it over once it is finished. */
function showBookActions(id: string) {
  const book = useLibrary.getState().books[id];
  if (!book) {
    return;
  }
  const finished = isFinished(book, useProgress.getState().positions[id]);
  Alert.alert(book.title, undefined, [
    finished
      ? { text: 'Reset progress', onPress: () => resetProgress(id) }
      : { text: 'Mark as finished', onPress: () => markFinished(id) },
    ...(finished ? [] : [{ text: 'Reset progress', onPress: () => resetProgress(id) }]),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

function HeaderTitle() {
  return (
    <View>
      <Text style={styles.brand}>Audinest</Text>
      <Text style={styles.brandLabel}>Library</Text>
    </View>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const booksById = useLibrary((state) => state.books);
  const positions = useProgress((state) => state.positions);
  const lastPlayedAt = useProgress((state) => state.lastPlayedAt);
  const sort = useSettings((state) => state.librarySort);
  const hideFinished = useSettings((state) => state.hideFinished);
  const playing = usePlayerState((state) => state.playing);
  const skipForward = useSettings((state) => state.skipForward);
  const { book: current, position } = useSelectedBook();
  const speed = useBookSpeed(current?.id);
  const allBooks = useMemo(() => Object.values(booksById), [booksById]);
  // Re-sorted on position updates too; cheap next to rendering, and keeps "Progress" order live.
  const books = useMemo(
    () => sortBooks(allBooks, sort, positions, lastPlayedAt, hideFinished),
    [allBooks, sort, positions, lastPlayedAt, hideFinished],
  );
  const sortIdx = LIBRARY_SORTS.findIndex(({ value }) => value === sort);
  const nextSort = () => useSettings.getState().setLibrarySort(LIBRARY_SORTS[(sortIdx + 1) % LIBRARY_SORTS.length].value);
  const toggleHideFinished = () => useSettings.getState().setHideFinished(!hideFinished);

  const openBook = useCallback((id: string) => {
    selectBook(id);
    openPlayer();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: HeaderTitle,
          headerLeft: () => (
            <Pressable onPress={openMenu} hitSlop={10} style={styles.menuButton} accessibilityLabel="Menu">
              <MaterialIcons name="menu" size={26} color={colors.onSurface} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={books}
        keyExtractor={(book) => book.id}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (current ? MINI_PLAYER_HEIGHT + spacing.lg : spacing.md),
        }}
        renderItem={({ item }) => (
          <AudiobookRow
            book={item}
            position={positions[item.id]}
            selected={item.id === current?.id}
            onPress={openBook}
            onLongPress={showBookActions}
          />
        )}
        ListHeaderComponent={allBooks.length > 0 ? (
          <View>
            {current && (
              <>
                <Text style={styles.eyebrow}>Continue listening</Text>
                <ResumeCard
                  book={current}
                  position={position}
                  speed={speed}
                  playing={playing}
                  play={play}
                  pause={pause}
                  onOpen={openPlayer}
                />
              </>
            )}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Library</Text>
              <Text style={styles.sectionCount}>
                {books.length < allBooks.length && `${books.length} of `}
                {allBooks.length} {allBooks.length === 1 ? 'book' : 'books'}
              </Text>
            </View>
            <View style={styles.listControls}>
              <Pill
                label={LIBRARY_SORTS[sortIdx]?.label ?? 'Title'}
                accessibilityLabel={`Sort by ${LIBRARY_SORTS[sortIdx]?.label ?? 'Title'}`}
                onPress={nextSort}
                icon={<MaterialIcons name="sort" size={18} color={colors.primary} />}
              />
              <Pill
                label={hideFinished ? 'Finished hidden' : 'Showing finished'}
                accessibilityLabel={hideFinished ? 'Show finished books' : 'Hide finished books'}
                onPress={toggleHideFinished}
                icon={(
                  <MaterialIcons
                    name={hideFinished ? 'visibility-off' : 'visibility'}
                    size={18}
                    color={colors.primary}
                  />
                )}
              />
            </View>
          </View>
        ) : undefined}
        ListEmptyComponent={allBooks.length > 0 ? (
          <Text style={styles.allFinished}>Every book is finished. Nice!</Text>
        ) : (
          <View style={styles.empty}>
            <MaterialIcons name="menu-book" size={48} color={colors.primary} />
            <Text style={styles.emptyText}>No audiobooks yet.</Text>
            <Pill
              filled
              label="Choose your audiobook folder"
              onPress={openMenu}
              icon={<MaterialIcons name="folder-open" size={18} color={colors.onPrimary} />}
            />
          </View>
        )}
      />
      {current && (
        <MiniPlayer
          book={current}
          position={position}
          playing={playing}
          play={play}
          pause={pause}
          skip={skip}
          skipSeconds={skipForward}
          onOpen={openPlayer}
          bottomInset={insets.bottom}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  menuButton: {
    marginRight: spacing.md,
  },
  brand: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 26,
    color: colors.onSurface,
  },
  brandLabel: {
    ...type.labelSm,
    color: colors.primary,
    letterSpacing: 2,
  },
  eyebrow: {
    ...type.labelSm,
    color: colors.primary,
    letterSpacing: 1.5,
    marginHorizontal: spacing.margin,
    marginTop: spacing.md,
    marginBottom: spacing.sm + 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginHorizontal: spacing.margin,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 4,
  },
  sectionTitle: {
    ...type.headlineMobile,
    color: colors.onSurface,
  },
  sectionCount: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
  },
  listControls: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.margin,
    marginBottom: spacing.sm + 4,
  },
  allFinished: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 96,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...type.headlineMobile,
    color: colors.onSurface,
  },
});
