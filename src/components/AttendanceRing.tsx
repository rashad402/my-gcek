import React, { useEffect, useRef } from 'react';
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
import { Fonts } from '@/constants/theme';

interface Props {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  variant: 'success' | 'warning' | 'danger';
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function getGradientColors(
  variant: 'success' | 'warning' | 'danger'
) {
  switch (variant) {
    case 'success':
      return ['#4ade80', '#16a34a'];

    case 'warning':
      return ['#fde047', '#eab308'];

    case 'danger':
      return ['#fb7185', '#ef4444'];
  }
}

export default function AttendanceRing({
  percentage,
  size = 58,
  strokeWidth = 5,
  variant,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [startColor, endColor] = getGradientColors(variant);

  const textColor =
    variant === 'success'
      ? '#22c55e'
      : variant === 'warning'
      ? '#eab308'
      : '#ef4444';

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.max(0, Math.min(100, percentage)),
      duration: 900,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [percentage, animatedValue]);

  const animatedStroke = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const gradId = `grad-${variant}`;

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Svg width={size} height={size}>
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
        style={[
          styles.text,
          {
            color: textColor,
          },
        ]}
      >
        {percentage}%
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
