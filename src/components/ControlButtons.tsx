import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, glow, radius } from '@/theme';

export const SKIP_SECONDS = 20;

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  label: string;
  size?: number;
}

/** Round ghost button for secondary transport controls. */
export function IconButton({ name, onPress, label, size = 52 }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.ghost,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}
    >
      <MaterialIcons name={name} size={Math.round(size * 0.48)} color={colors.onSurface} />
    </Pressable>
  );
}

interface SkipIconProps {
  seconds: number;
  size: number;
  color: string;
}

/** Circular arrow with the skip amount inside, mirrored for forward skips. */
export function SkipIcon({ seconds, size, color }: SkipIconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons
        name="replay"
        size={size}
        color={color}
        style={[StyleSheet.absoluteFill, seconds > 0 && styles.mirrored]}
      />
      <Text style={[styles.skipText, { color, fontSize: size * 0.3, marginTop: size * 0.12 }]}>
        {Math.abs(seconds)}
      </Text>
    </View>
  );
}

interface SkipButtonProps {
  seconds: number;
  onPress: () => void;
  size?: number;
}

export function SkipButton({ seconds, onPress, size = 52 }: SkipButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${seconds < 0 ? 'Back' : 'Forward'} ${Math.abs(seconds)} seconds`}
      style={({ pressed }) => [styles.ghost, { width: size, height: size }, pressed && styles.pressed]}
    >
      <SkipIcon seconds={seconds} size={Math.round(size * 0.55)} color={colors.onSurface} />
    </Pressable>
  );
}

interface PlayButtonProps {
  playing: boolean;
  play: () => void;
  pause: () => void;
  size?: number;
}

/** Filled play/pause circle with a soft glow. */
export function PlayButton({ playing, play, pause, size = 80 }: PlayButtonProps) {
  return (
    <Pressable
      onPress={playing ? pause : play}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      style={({ pressed }) => [
        styles.play,
        { width: size, height: size },
        pressed && styles.playPressed,
      ]}
    >
      <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={Math.round(size * 0.5)} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ghost: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
  },
  pressed: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  skipText: {
    fontFamily: fonts.sansSemiBold,
    includeFontPadding: false,
  },
  play: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    boxShadow: glow,
  },
  playPressed: {
    transform: [{ scale: 0.95 }],
  },
});
