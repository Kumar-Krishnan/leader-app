/**
 * LeaderImpact Theme
 *
 * Color palette based on LeaderImpact branding:
 * - Primary: Bright Yellow/Gold (#F9C80E)
 * - Background: Dark charcoal/gray
 * - Text: White on dark, dark on light
 */

export const colors = {
  // Primary - Bright Yellow/Gold (LeaderImpact brand color)
  primary: {
    50: '#FFFEF0',
    100: '#FFF9C4',
    200: '#FFF59D',
    300: '#FFF176',
    400: '#FFEE58',
    500: '#F9C80E', // Main LeaderImpact yellow
    600: '#F9A825',
    700: '#F57F17',
    800: '#E65100',
    900: '#BF360C',
  },

  // Neutral - Dark grays (for backgrounds)
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    850: '#363636', // Card background
    900: '#2D2D2D', // Main dark background
    950: '#1A1A1A', // Darker elements
  },

  // Semantic colors
  success: {
    light: '#A5D6A7',
    main: '#4CAF50',
    dark: '#388E3C',
  },
  warning: {
    light: '#FFE082',
    main: '#FFC107',
    dark: '#FFA000',
  },
  error: {
    light: '#EF9A9A',
    main: '#F44336',
    dark: '#D32F2F',
  },
  info: {
    light: '#90CAF9',
    main: '#2196F3',
    dark: '#1976D2',
  },

  // Background colors (dark theme)
  background: {
    primary: '#2D2D2D',    // Main background
    secondary: '#363636',   // Cards, elevated surfaces
    tertiary: '#424242',    // Subtle distinctions
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    tertiary: '#808080',
    inverse: '#2D2D2D',
    link: '#F9C80E',
  },

  // Border colors
  border: {
    light: '#4A4A4A',
    medium: '#5A5A5A',
    dark: '#6A6A6A',
  },

  // Special UI colors
  card: {
    background: '#363636',
    border: '#4A4A4A',
  },

  // Status colors for RSVP
  rsvp: {
    accepted: '#4CAF50',
    acceptedBg: 'rgba(76, 175, 80, 0.15)',
    maybe: '#F9C80E',
    maybeBg: 'rgba(249, 200, 14, 0.15)',
    declined: '#F44336',
    declinedBg: 'rgba(244, 67, 54, 0.15)',
    invited: '#9E9E9E',
  },

  // Accent color for series/special items
  accent: {
    main: '#F9C80E',
    light: 'rgba(249, 200, 14, 0.2)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 28,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Common style presets
export const commonStyles = {
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  card: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.neutral[700],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
  commonStyles,
};
