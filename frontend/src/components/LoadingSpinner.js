/**
 * Loading Spinner Component - Consistent Loading UI
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from 'react-native-paper';

const LoadingSpinner = ({ size = 'large', color = null }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, styles[size]]}>
      <ActivityIndicator
        size={size}
        color={color || theme.colors.primary}
        animating={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  small: {
    padding: 12,
  },
  medium: {
    padding: 16,
  },
  large: {
    padding: 24,
  },
});

export default React.memo(LoadingSpinner);