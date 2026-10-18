import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/theme';
import { Pill } from './Pill';

export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

interface Props {
  speed: number;
  onChange: (speed: number) => void;
}

/** Tapping cycles through the playback speeds. */
export function SpeedButton({ speed, onChange }: Props) {
  const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  return (
    <Pill
      onPress={() => onChange(nextSpeed)}
      accessibilityLabel={`Playback speed ${speed}x`}
      icon={<MaterialIcons name="speed" size={18} color={colors.primary} />}
      label={`${speed}×`}
    />
  );
}
