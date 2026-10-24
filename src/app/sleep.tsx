import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { setSleepTimer } from '@/audio/playback';
import { goBack } from '@/lib/navigation';
import { usePlayerState } from '@/store/usePlayerState';
import { useSleepLabel } from '@/store/useSleepLabel';
import { colors, eyebrow, pressedStyle, radius, spacing, type } from '@/theme';

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
    goBack('/player');
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
          const active = value === null
            ? !sleep
            : value === 'chapter'
              ? sleep?.kind === 'chapter'
              : sleep?.kind === 'minutes' && sleep.minutes === value;
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
  eyebrow,
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
    borderColor: colors.highlight,
  },
  pressed: pressedStyle,
  label: {
    ...type.titleMd,
    color: colors.onSurface,
  },
  labelActive: {
    color: colors.primary,
  },
});
