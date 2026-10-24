import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { markFinished, pause, play, resetProgress, selectBook, skip } from '@/audio/playback';
import { AudiobookRow } from '@/components/AudiobookRow';
import { MINI_PLAYER_HEIGHT, MiniPlayer } from '@/components/MiniPlayer';
import { Pill } from '@/components/Pill';
import { ResumeCard } from '@/components/ResumeCard';
import { LIBRARY_SORTS, sortBooks } from '@/lib/library';
import { push } from '@/lib/navigation';
import { isFinished } from '@/lib/position';
import { useLibrary } from '@/store/useLibrary';
import { usePlayerState } from '@/store/usePlayerState';
import { useProgress } from '@/store/useProgress';
import { useBookSpeed, useSelectedBook } from '@/store/useSelectedBook';
import { useSettings } from '@/store/useSettings';
import { colors, eyebrow, fonts, spacing, type } from '@/theme';

const openPlayer = () => push('/player');
const openMenu = () => push('/menu');

/** Long press on a book: mark it finished, or start it over once it is finished. Then `onDone`. */
function showBookActions(id: string, onDone: () => void) {
  const book = useLibrary.getState().books[id];
  if (!book) {
    return;
  }
  const finished = isFinished(book, useProgress.getState().positions[id]);
  Alert.alert(book.title, undefined, [
    finished
      ? { text: 'Reset progress', onPress: () => { resetProgress(id); onDone(); } }
      : { text: 'Mark as finished', onPress: () => { markFinished(id); onDone(); } },
    ...(finished ? [] : [{ text: 'Reset progress', onPress: () => { resetProgress(id); onDone(); } }]),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

const NO_POSITIONS: Record<string, never> = {};

function HeaderTitle() {
  return (
    <View>
      <Text style={styles.brand}>Audinest</Text>
      <Text style={styles.brandLabel}>Library</Text>
    </View>
  );
}

function MenuButton() {
  return (
    <Pressable onPress={openMenu} hitSlop={10} style={styles.menuButton} accessibilityRole="button" accessibilityLabel="Menu">
      <MaterialIcons name="menu" size={26} color={colors.onSurface} />
    </Pressable>
  );
}

// A constant, so re-renders (every second while playing) don't set the header options again.
const SCREEN_OPTIONS = { headerTitle: HeaderTitle, headerLeft: MenuButton };

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
  // Positions change every second while playing. The order follows them only when the library comes
  // back into view or the sort changes, so a book doesn't move away just as the user taps it.
  const [sortedAt, setSortedAt] = useState(() => useProgress.getState().positions);
  const resort = useCallback(() => setSortedAt(useProgress.getState().positions), []);
  useFocusEffect(resort);
  const sortPositions = sort === 'progress' || hideFinished ? sortedAt : NO_POSITIONS;
  const books = useMemo(
    () => sortBooks(allBooks, sort, sortPositions, lastPlayedAt, hideFinished),
    [allBooks, sort, sortPositions, lastPlayedAt, hideFinished],
  );
  const sortIdx = LIBRARY_SORTS.findIndex(({ value }) => value === sort);
  const nextSort = () => {
    resort();
    useSettings.getState().setLibrarySort(LIBRARY_SORTS[(sortIdx + 1) % LIBRARY_SORTS.length].value);
  };
  const toggleHideFinished = () => {
    resort();
    useSettings.getState().setHideFinished(!hideFinished);
  };

  const openBookActions = useCallback((id: string) => showBookActions(id, resort), [resort]);
  const openBook = useCallback((id: string) => {
    selectBook(id);
    openPlayer();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={SCREEN_OPTIONS} />
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
            onLongPress={openBookActions}
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
    ...eyebrow,
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
