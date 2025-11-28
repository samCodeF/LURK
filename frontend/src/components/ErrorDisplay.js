/**
 * Error Display Component - Shows Error Messages with Retry Options
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Surface,
  Button,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';

const ErrorDisplay = ({ error, onRetry, retryText = 'Try Again' }) => {
  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  if (!error) {
    return null;
  }

  return (
    <Surface style={styles.container}>
      <View style={styles.errorContent}>
        <View style={styles.errorIcon}>
          <Icon name="alert-circle-outline" size={48} color="#F44336" />
        </View>
        <View style={styles.errorText}>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      </View>
        {onRetry && (
          <View style={styles.retryButton}>
            <Button
              mode="contained"
              onPress={handleRetry}
              style={styles.retryButtonInner}
              icon="refresh"
            >
              {retryText}
            </Button>
          </View>
        )}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 24,
  },
  errorContent: {
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  retryButtonInner: {
    paddingHorizontal: 24,
    backgroundColor: '#4A90E2',
  },
});

export default React.memo(ErrorDisplay);