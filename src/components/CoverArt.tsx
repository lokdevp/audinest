import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { coverInitials, coverTint } from '@/lib/cover';
import { colors, fonts } from '@/theme';

interface Props {
  uri: string | null;
  title: string;
  author?: string | null;
  style: StyleProp<ViewStyle>;
  /** Placeholder text size. */
  fontSize: number;
  /** Show the title and author in the placeholder instead of the initials. */
  fullTitle?: boolean;
}

/** Cover image, or a generated jacket in a per-book tint when the book has no cover. */
export function CoverArt({ uri, title, author, style, fontSize, fullTitle = false }: Props) {
  if (uri) {
    return (
      <View style={[styles.frame, style]}>
        <Image resizeMode="cover" style={styles.image} source={{ uri }} />
      </View>
    );
  }
  const tint = coverTint(title);
  return (
    <View style={[styles.frame, styles.placeholder, { backgroundColor: tint.background }, style]}>
      <View style={[styles.spine, { backgroundColor: tint.accent }]} />
      {fullTitle ? (
        <View style={styles.jacket}>
          <Text style={[styles.title, { fontSize, lineHeight: fontSize * 1.2 }]} numberOfLines={4}>
            {title}
          </Text>
          <View style={[styles.rule, { backgroundColor: tint.accent }]} />
          {author ? (
            <Text style={[styles.author, { fontSize: fontSize * 0.5, lineHeight: fontSize * 0.7 }]} numberOfLines={2}>
              {author}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={[styles.initials, { color: tint.accent, fontSize, lineHeight: fontSize * 1.2 }]} numberOfLines={1}>
          {coverInitials(title)}
        </Text>
      )}
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
    justifyContent: 'center',
  },
  spine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '6%',
    minWidth: 3,
  },
  jacket: {
    paddingLeft: '14%',
    paddingRight: '8%',
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.serif,
  },
  rule: {
    width: '25%',
    height: 2,
    marginVertical: 12,
  },
  author: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sans,
  },
  initials: {
    fontFamily: fonts.serifMedium,
    textAlign: 'center',
    marginLeft: '6%',
  },
});
