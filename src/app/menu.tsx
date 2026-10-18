import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/Pill';
import { loadLibrary, pickLibraryFolder } from '@/store/libraryActions';
import { useLibrary } from '@/store/useLibrary';
import { usePlayerState } from '@/store/usePlayerState';
import { SKIP_OPTIONS, useSettings } from '@/store/useSettings';
import { colors, radius, spacing, type } from '@/theme';

const nextSkip = (seconds: number) => SKIP_OPTIONS[(SKIP_OPTIONS.indexOf(seconds) + 1) % SKIP_OPTIONS.length];

function PlaybackSettings() {
  const settings = useSettings();
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Playback</Text>
      <Text style={styles.heading}>Controls</Text>
      <Text style={styles.text}>Tap a setting to change it.</Text>
      <View style={styles.buttons}>
        <Pill
          label={`Skip back ${settings.skipBack} s`}
          onPress={() => settings.setSkipBack(nextSkip(settings.skipBack))}
          icon={<MaterialIcons name="replay" size={18} color={colors.primary} />}
        />
        <Pill
          label={`Skip forward ${settings.skipForward} s`}
          onPress={() => settings.setSkipForward(nextSkip(settings.skipForward))}
          icon={<MaterialIcons name="forward-30" size={18} color={colors.primary} />}
        />
        <Pill
          label={`Rewind on resume: ${settings.rewindOnResume ? 'On' : 'Off'}`}
          onPress={() => settings.setRewindOnResume(!settings.rewindOnResume)}
          icon={<MaterialIcons name="history" size={18} color={colors.primary} />}
        />
      </View>
    </View>
  );
}

export default function MenuScreen() {
  const libraryUri = useLibrary((state) => state.libraryUri);
  const scan = usePlayerState((state) => state.scan);

  const scanAndReturn = async (uri: string, full = false) => {
    await loadLibrary(uri, { full });
    router.back();
  };

  const pickFolder = async () => {
    const uri = await pickLibraryFolder();
    if (uri) {
      await scanAndReturn(uri);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Library</Text>
        <Text style={styles.heading}>Audiobook folder</Text>
        <Text style={styles.text}>
          Each folder or audio file directly inside the chosen folder becomes one audiobook.
          Rescan only reads books whose files changed; Full rescan reads everything again.
        </Text>
        {libraryUri && (
          <Text style={styles.path} numberOfLines={2}>
            {decodeURIComponent(libraryUri)}
          </Text>
        )}
        {scan ? (
          <View style={styles.scanning}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.text}>
              {scan.total > 0 ? `Scanning ${scan.done}/${scan.total}` : 'Reading folder…'}
            </Text>
          </View>
        ) : (
          <View style={styles.buttons}>
            <Pill
              filled
              label="Select Folder"
              onPress={pickFolder}
              icon={<MaterialIcons name="folder-open" size={18} color={colors.onPrimary} />}
            />
            {libraryUri && (
              <Pill
                label="Rescan"
                onPress={() => scanAndReturn(libraryUri)}
                icon={<MaterialIcons name="refresh" size={18} color={colors.primary} />}
              />
            )}
            {libraryUri && (
              <Pill
                label="Full rescan"
                accessibilityLabel="Full rescan: read every file again"
                onPress={() => scanAndReturn(libraryUri, true)}
                icon={<MaterialIcons name="sync" size={18} color={colors.primary} />}
              />
            )}
          </View>
        )}
      </View>
      <PlaybackSettings />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.margin,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md + 4,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceContainerLow,
  },
  eyebrow: {
    ...type.labelSm,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  heading: {
    ...type.headlineMobile,
    color: colors.onSurface,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  text: {
    ...type.bodyMd,
    color: colors.onSurface,
  },
  path: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 4,
    marginTop: spacing.md,
  },
  scanning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginTop: spacing.md,
  },
});
