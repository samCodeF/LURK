import { StyleSheet, Dimensions } from 'react-native';
import { Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const colors = {
  background: '#0a0a0a',
  foreground: '#fafafa',
  card: '#141414',
  cardForeground: '#fafafa',
  primary: '#22c55e',
  primaryForeground: '#052e16',
  secondary: '#a855f7',
  secondaryForeground: '#581c87',
  muted: '#1f1f1f',
  mutedForeground: '#a3a3a3',
  accent: '#1f1f1f',
  accentForeground: '#fafafa',
  destructive: '#ef4444',
  destructiveForeground: '#fafafa',
  border: '#1f1f1f',
  input: '#1f1f1f',
  ring: '#22c55e',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const typography = {
  heading: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subheading: {
    fontWeight: '600',
  },
  body: {
    fontWeight: '400',
  },
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'web' ? 0 : 44,
  },
  sectionContainer: {
    paddingHorizontal: width > 768 ? spacing.lg : spacing.md,
    paddingVertical: spacing.xxl,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  glassCard: {
    backgroundColor: colors.card + '80',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  buttonOutlineText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  gradientBackground: {
    position: 'absolute',
    width: width * 0.8,
    height: height * 0.4,
    borderRadius: 9999,
    opacity: 0.3,
  },
  gradientPrimary: {
    backgroundColor: colors.primary,
  },
  gradientSecondary: {
    backgroundColor: colors.secondary,
  },
  textGradient: {
    color: colors.primary,
  },
  shadowGlow: {
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -spacing.sm,
  },
  responsiveGridItem: {
    width: width > 768 ? '33.333%' : '100%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
});

// Breakpoint utilities
export const useResponsive = () => {
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  return {
    isMobile,
    isTablet,
    isDesktop,
    width,
    height,
  };
};

// Animation timing
export const animations = {
  fast: 200,
  normal: 300,
  slow: 500,
  slower: 800,
};

// Web-specific styles
export const webStyles = Platform.OS === 'web' ? StyleSheet.create({
  scrollContainer: {
    scrollBehavior: 'smooth',
  },
  hoverScale: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease-in-out',
  },
  hoverScaleHover: {
    transform: [{ scale: 1.05 }],
  },
}) : {};