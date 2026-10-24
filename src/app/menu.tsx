import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/Pill';
import { folderLabel } from '@/lib/format';
import type { ScanProgress } from '@/lib/scan';
import { goBack } from '@/lib/navigation';
import { loadLibrary, pickLibraryFolder } from '@/store/libraryActions';
import { useLibrary } from '@/store/useLibrary';
import { usePlayerState } from '@/store/usePlayerState';
import { SKIP_OPTIONS, useSettings } from '@/store/useSettings';
import { colors, eyebrow, radius, spacing, type } from '@/theme';

function scanLabel({ phase, done, total }: ScanProgress) {
  if (total === 0) return 'Reading folder…';
  return phase === 'listing' ? `Reading folders ${done}/${total}` : `Scanning ${done}/${total}`;
}

const nextSkip = (seconds: number) => SKIP_OPTIONS[(SKIP_OPTIONS.indexOf(seconds) + 1) % SKIP_OPTIONS.length];

function PlaybackSettings() {
  // Only the values shown here, so library sort changes don't re-render the menu.
  const skipBack = useSettings((state) => state.skipBack);
  const skipForward = useSettings((state) => state.skipForward);
  const rewindOnResume = useSettings((state) => state.rewindOnResume);
  const { setSkipBack, setSkipForward, setRewindOnResume } = useSettings.getState();
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Playback</Text>
      <Text style={styles.heading}>Controls</Text>
      <Text style={styles.text}>Tap a setting to change it.</Text>
      <View style={styles.buttons}>
        <Pill
          label={`Skip back ${skipBack} s`}
          onPress={() => setSkipBack(nextSkip(skipBack))}
          icon={<MaterialIcons name="replay" size={18} color={colors.primary} />}
        />
        <Pill
          label={`Skip forward ${skipForward} s`}
          onPress={() => setSkipForward(nextSkip(skipForward))}
          icon={<MaterialIcons name="forward-30" size={18} color={colors.primary} />}
        />
        <Pill
          label={`Rewind on resume: ${rewindOnResume ? 'On' : 'Off'}`}
          onPress={() => setRewindOnResume(!rewindOnResume)}
          icon={<MaterialIcons name="history" size={18} color={colors.primary} />}
        />
      </View>
    </View>
  );
}

export default function MenuScreen() {
  const libraryUri = useLibrary((state) => state.libraryUri);
  const scan = usePlayerState((state) => state.scan);
  // A scan can outlast the screen: only go back if the user is still here when it ends.
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => {
      focused.current = false;
    };
  }, []));

  const scanAndReturn = async (uri: string, full = false) => {
    if (await loadLibrary(uri, { full }) === 'failed') {
      Alert.alert(
        "Can't read the folder",
        'It may have been moved, or the app lost access to it. Pick the folder again.',
      );
    } else if (focused.current) {
      goBack();
    }
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
            {folderLabel(libraryUri)}
          </Text>
        )}
        {scan ? (
          <View style={styles.scanning}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.text}>
              {scanLabel(scan)}
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
  eyebrow,
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
