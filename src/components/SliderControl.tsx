import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formattedTime } from '@/lib/format';
import { colors, type } from '@/theme';

interface Props {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

/** Chapter progress slider. While dragging it shows the dragged time instead of the playing time. */
export function SliderControl({ currentTime, duration, onSeek }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const shownTime = dragging ?? currentTime;
  return (
    <View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={Math.max(duration, 1)}
        value={shownTime}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.surfaceContainerHighest}
        thumbTintColor={colors.primary}
        onSlidingStart={(value) => setDragging(value)}
        onValueChange={(value) => {
          if (dragging !== null) setDragging(value);
        }}
        onSlidingComplete={(value) => {
          setDragging(null);
          onSeek(value);
        }}
      />
      <View style={styles.timeInfo}>
        <Text style={[styles.time, styles.elapsed]}>{formattedTime(shownTime)}</Text>
        <Text style={[styles.time, styles.total]}>Chapter total {formattedTime(duration)}</Text>
        <Text style={[styles.time, styles.remaining]}>-{formattedTime(Math.max(0, duration - shownTime))}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slider: {
    height: 36,
    marginHorizontal: -8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    ...type.timer,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  elapsed: {
    color: colors.primary,
    fontFamily: type.titleMd.fontFamily,
  },
  total: {
    flex: 2,
    textAlign: 'center',
  },
  remaining: {
    textAlign: 'right',
  },
});
