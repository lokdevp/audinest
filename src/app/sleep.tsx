import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { setSleepTimer } from '@/audio/playback';
import { usePlayerState } from '@/store/usePlayerState';
import { useSleepLabel } from '@/store/useSleepLabel';
import { colors, radius, spacing, type } from '@/theme';

type Choice = number | 'chapter' | null;

const CHOICES: { label: string; value: Choice }[] = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
  { label: 'End of chapter', value: 'chapter' },
  { label: 'Off', value: null },
];

export default function SleepScreen() {
  const sleep = usePlayerState((state) => state.sleep);
  const label = useSleepLabel();

  const choose = (value: Choice) => {
    setSleepTimer(value);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Sleep timer</Text>
      <Text style={styles.heading}>
        {sleep?.kind === 'chapter' && 'Pausing at the end of the chapter'}
        {sleep?.kind === 'minutes' && `Pausing in ${label}`}
        {!sleep && 'Pause playback after'}
      </Text>
      <View style={styles.list}>
        {CHOICES.map(({ label, value }) => {
          const active = value === 'chapter' ? sleep?.kind === 'chapter' : value === null && !sleep;
          return (
            <Pressable
              key={label}
              onPress={() => choose(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.row, active && styles.active, pressed && styles.pressed]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
              {active && <MaterialIcons name="check" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.margin,
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
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceContainerLow,
  },
  active: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: 'rgba(125, 211, 252, 0.25)',
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    ...type.titleMd,
    color: colors.onSurface,
  },
  labelActive: {
    color: colors.primary,
  },
});
