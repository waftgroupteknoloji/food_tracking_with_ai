import {
  Image,
  View,
  StyleSheet,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

type Props = {
  photoUrl?: string | null;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const GRADIENT_COLORS: readonly [string, string] = ['#f4d77a', '#f08d6a'];

export function MealPhoto({ photoUrl, style, className }: Props) {
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={style as StyleProp<ImageStyle>}
        className={className}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.wrap, style]} className={className}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Steam wisps */}
        <Path
          d="M 38 18 Q 41 13 38 8 Q 35 3 38 -2"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 50 14 Q 53 9 50 4 Q 47 -1 50 -6"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 62 18 Q 65 13 62 8 Q 59 3 62 -2"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Plate drop shadow */}
        <Ellipse cx="50" cy="86" rx="34" ry="4" fill="rgba(0,0,0,0.15)" />

        {/* Plate outer */}
        <Circle cx="50" cy="58" r="32" fill="#FFFDF8" />
        {/* Plate inner rim */}
        <Circle
          cx="50"
          cy="58"
          r="24"
          fill="none"
          stroke="#EFE2CC"
          strokeWidth="1"
        />

        {/* Food: warm centerpiece */}
        <Ellipse cx="50" cy="58" rx="16" ry="11" fill="#E8865A" />
        <Ellipse cx="46" cy="55" rx="6" ry="4" fill="#F4A47A" />

        {/* Garnish dots */}
        <Circle cx="42" cy="60" r="2.2" fill="#B8F04D" />
        <Circle cx="56" cy="54" r="1.8" fill="#F4D77A" />
        <Circle cx="54" cy="62" r="1.6" fill="#B8F04D" />
        <Circle cx="48" cy="63" r="1.2" fill="#FFFDF8" opacity="0.9" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
