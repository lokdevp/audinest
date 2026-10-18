import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/theme';

interface Props {
  uri: string | null;
  title: string;
  style: StyleProp<ViewStyle>;
  /** Placeholder text size. */
  fontSize: number;
  /** Show the whole title in the placeholder instead of its first letter. */
  fullTitle?: boolean;
}

/** Cover image, or a placeholder with the title when the book has no cover. */
export function CoverArt({ uri, title, style, fontSize, fullTitle = false }: Props) {
  if (uri) {
    return (
      <View style={[styles.frame, style]}>
        <Image resizeMode="cover" style={styles.image} source={{ uri }} />
      </View>
    );
  }
  return (
    <View style={[styles.frame, styles.placeholder, style]}>
      <Text style={[styles.text, { fontSize, lineHeight: fontSize * 1.2 }]} numberOfLines={fullTitle ? 6 : 1}>
        {fullTitle ? title : title.charAt(0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
  },
  text: {
    color: colors.primary,
    fontFamily: fonts.serif,
    textAlign: 'center',
    margin: 8,
  },
});
