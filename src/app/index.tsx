import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pause, play, selectBook, skip } from '@/audio/playback';
import { AudiobookRow } from '@/components/AudiobookRow';
import { MINI_PLAYER_HEIGHT, MiniPlayer } from '@/components/MiniPlayer';
import { Pill } from '@/components/Pill';
import { ResumeCard } from '@/components/ResumeCard';
import { useLibrary } from '@/store/useLibrary';
import { usePlayerState } from '@/store/usePlayerState';
import { useProgress } from '@/store/useProgress';
import { useSelectedBook } from '@/store/useSelectedBook';
import { colors, fonts, spacing, type } from '@/theme';

const openPlayer = () => router.push('/player');
const openMenu = () => router.push('/menu');

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
  const speed = useProgress((state) => state.speed);
  const playing = usePlayerState((state) => state.playing);
  const { book: current, position } = useSelectedBook();
  const books = useMemo(
    () =>
      Object.values(booksById).sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })),
    [booksById],
  );

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
          />
        )}
        ListHeaderComponent={books.length > 0 ? (
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
                {books.length} {books.length === 1 ? 'book' : 'books'}
              </Text>
            </View>
          </View>
        ) : undefined}
        ListEmptyComponent={(
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
