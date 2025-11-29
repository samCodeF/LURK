/**
 * Theme Configuration
 * React Native Paper theme for Lurk App
 */

import {MD3LightTheme, MD3DarkTheme} from 'react-native-paper';

const customColors = {
  primary: '#4CAF50', // Green for Indian financial apps
  secondary: '#FF6B35', // Orange accent
  tertiary: '#2196F3', // Blue for trust
  error: '#F44336', // Red for alerts
  warning: '#FF9800', // Amber for warnings
  success: '#4CAF50', // Green for success
  info: '#2196F3', // Blue for info
  background: '#FAFAFA', // Light gray background
  surface: '#FFFFFF', // White for cards
  text: '#212121', // Dark text
  textSecondary: '#757575', // Secondary text
  border: '#E0E0E0', // Light borders
  shadow: 'rgba(0, 0, 0, 0.1)', // Shadow color
};

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: customColors.primary,
    secondary: customColors.secondary,
    error: customColors.error,
    background: customColors.background,
    surface: customColors.surface,
    onSurface: customColors.text,
    text: customColors.text,
    disabled: customColors.textSecondary,
    placeholder: customColors.textSecondary,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: customColors.primary,
  },
  roundness: 8,
  fonts: {
    ...MD3LightTheme.fonts,
    bodyLarge: {
      ...MD3LightTheme.fonts.bodyLarge,
      fontSize: 16,
    },
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: customColors.primary,
    secondary: customColors.secondary,
    error: customColors.error,
    background: '#121212',
    surface: '#1E1E1E',
    onSurface: '#FFFFFF',
    text: '#FFFFFF',
    disabled: '#757575',
    placeholder: '#BDBDBD',
    backdrop: 'rgba(0, 0, 0, 0.8)',
    notification: customColors.primary,
  },
  roundness: 8,
};

export const theme = lightTheme;
export const darkTheme = darkTheme;
export const colors = customColors;

export default theme;