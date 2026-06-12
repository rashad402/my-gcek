import React, { useEffect, useRef, useState, useId } from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Fonts, ThemeColors } from '@/constants/theme';

interface Props {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  variant: 'success' | 'warning' | 'danger';
  colors: ThemeColors;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AttendanceRing({
  percentage,
  size = 58,
  strokeWidth = 5,
  variant,
  colors,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Use a unique ID per instance to avoid gradient ID collisions
  const uid = useId();
  const cleanUid = uid.replace(/:/g, '');
  const gradId = `grad-${variant}-${cleanUid}`;

  // Resolve colors dynamically from the active theme colors
  const textColor =
    variant === 'success'
      ? colors.success
      : variant === 'warning'
      ? colors.warning
      : colors.danger;

  const startColor = textColor;
  const endColor =
    variant === 'success'
      ? `${colors.success}CC`
      : variant === 'warning'
      ? `${colors.warning}CC`
      : `${colors.danger}CC`;

  const [displayPct, setDisplayPct] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Listen to the animated value to drive a local state that animates the count-up text
    const listenerId = animatedValue.addListener(({ value }) => {
      setDisplayPct(Math.round(value));
    });

    Animated.timing(animatedValue, {
      toValue: Math.max(0, Math.min(100, percentage)),
      duration: 900,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [percentage, animatedValue]);

  const animatedStroke = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`${percentage} percent attendance`}
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Svg width={size} height={size} accessible={false}>
        <Defs>
          <LinearGradient
            id={gradId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop
              offset="0%"
              stopColor={startColor}
            />
            <Stop
              offset="100%"
              stopColor={endColor}
            />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          stroke="rgba(128, 128, 128, 0.15)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Progress ring */}
        <AnimatedCircle
          stroke={`url(#${gradId})`}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={animatedStroke}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <Text
        accessible={false}
        style={[
          styles.text,
          {
            color: textColor,
          },
        ]}
      >
        {displayPct}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    fontSize: 13,
    fontFamily: Fonts.bodyBold,
  },
});
