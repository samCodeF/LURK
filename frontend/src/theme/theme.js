/**
 * Theme Configuration for Lurk App
 * Consistent color scheme, typography, and component styling
 */

export const colors = {
  // Primary Colors
  primary: '#4A90E2',        // Lurk Brand Blue
  primaryDark: '#3A8FBA',     // Darker blue

  // Accent Colors
  secondary: '#FF6B6B',      // Orange for actions
  success: '#10B981',      // Green for success states
  warning: '#FF9800',      // Orange for warnings
  error: '#E53E3E3',      // Red for errors

  // Neutral Colors
  surface: '#FFFFFF',        // White backgrounds
  background: '#F5F5F5',      // Light gray backgrounds
  card: '#FFFFFF',        // Card backgrounds

  // Text Colors
  text: {
    primary: '#1F2937',      // Dark text for light backgrounds
    secondary: '#666666',      // Medium gray
    tertiary: '#999999',      // Light gray
    inverse: '#FFFFFF',      // White text for dark backgrounds
  },

  // Border & Divider Colors
  border: '#E0E0E0',      // Light borders
  divider: '#F0F0F0',      // Subtle dividers

  // Status Colors
  status: {
    active: '#10B981',      // Green for active states
    inactive: '#9CA3AF',      // Gray for inactive states
    disabled: '#E0E0E0',      // Light gray for disabled states
  },
};

export const typography = {
  // Font Families
  primary: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',

  // Font Sizes
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,

  // Font Weights
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '900',

  // Line Heights (1.4x font size)
  lineHeight: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xl: 16,
  round: 50,
};

export const shadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const dimensions = {
  // Screen dimensions
  window: {
    width: 375,
    height: 812,
  },

  // Component dimensions
  card: {
    height: 200,
    elevation: 3,
  },

  // Button dimensions
  button: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 8,
  },

  // Input dimensions
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
};

export const accessibility = {
  minimumTouchArea: 44,
  buttonLabelSize: 'md',
};

export const animations = {
  duration: {
    short: 200,
    medium: 300,
    long: 500,
  },
  spring: {
    tension: 300,
    friction: 10,
    mass: 1,
    overshootClamping: 'extend',
  },
};

export const breakpoints = {
  small: 320,
  medium: 768,
  large: 1024,
  xlarge: 1200,
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  dimensions,
  accessibility,
  animations,
  breakpoints,

  // Light theme configuration
  mode: 'light',

  // Dark theme configuration
  mode: 'dark',

  // Combine all theme properties
  ...colors,
  ...typography,
  ...spacing,
  ...borderRadius,
  ...shadows,
  ...dimensions,
  ...accessibility,
  ...animations,
  ...breakpoints,
};

export default theme;