import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1b1c1d',
    textSecondary: '#434653',
    background: '#faf9fa',
    primary: '#094cb2',
    primaryContainer: '#3366cc',
    secondary: '#5a5f63',
    secondaryContainer: '#dfe3e8',
    tertiary: '#6d5e00',
    tertiaryContainer: '#bfab49',
    error: '#ba1a1a',
    errorContainer: '#ffdad6',

    // Semantic status colors
    success: '#22c55e',
    warning: '#eab308',
    danger: '#ef4444',
    
    // Surface Levels
    surface: '#faf9fa',
    surfaceLowest: '#ffffff',
    surfaceLow: '#f5f3f4',
    surfaceContainer: '#efedee',
    surfaceHigh: '#e9e8e9',
    surfaceHighest: '#e3e2e3',
    surfaceDim: '#dbdadb',
    
    // Support for original template components
    backgroundElement: '#efedee',
    backgroundSelected: '#e9e8e9',
    
    // Outline and Borders
    outline: '#737784',
    outlineVariant: '#c3c6d5',
    ghostBorder: 'rgba(195, 198, 213, 0.15)',
  },
  dark: {
    text: '#f2f0f1',
    textSecondary: '#c3c6d5',
    background: '#1b1c1d',
    primary: '#b1c5ff',
    primaryContainer: '#00419d',
    secondary: '#dfe3e8',
    secondaryContainer: '#42474b',
    tertiary: '#f9e37a',
    tertiaryContainer: '#524600',
    error: '#ffdad6',
    errorContainer: '#93000a',

    // Semantic status colors
    success: '#4ade80',
    warning: '#facc15',
    danger: '#f87171',
    
    // Surface Levels
    surface: '#1b1c1d',
    surfaceLowest: '#121213',
    surfaceLow: '#212223',
    surfaceContainer: '#2c2d2e',
    surfaceHigh: '#37383a',
    surfaceHighest: '#424345',
    surfaceDim: '#151617',
    
    // Support for original template components
    backgroundElement: '#2c2d2e',
    backgroundSelected: '#37383a',
    
    // Outline and Borders
    outline: '#8d909e',
    outlineVariant: '#434653',
    ghostBorder: 'rgba(67, 70, 83, 0.25)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;
export type ThemeColors = {
  readonly [K in keyof typeof Colors.light]: string;
};

export const Fonts = {
  headline: 'NotoSerif_400Regular',
  headlineBold: 'NotoSerif_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
  label: 'PublicSans_500Medium',
  labelBold: 'PublicSans_600SemiBold',
  
  // Support for template font requirements
  sans: 'System',
  serif: 'Georgia',
  rounded: 'System',
  mono: 'Courier',
};

export const Spacing = {
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const Roundness = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 600;
