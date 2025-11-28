/**
 * Lurk - Credit Card Automation App
 * Main Application Entry Point
 */

import React, { useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  Alert,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { store, persistor } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/constants/theme';
import { initializeFirebase } from './src/services/firebaseService';
import { checkBiometricAvailability } from './src/services/biometricService';

const App = () => {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize Firebase
      await initializeFirebase();

      // Check biometric availability
      const biometricAvailable = await checkBiometricAvailability();
      console.log('Biometric authentication available:', biometricAvailable);

      console.log('Lurk App initialized successfully');
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize some app features. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <SafeAreaView style={styles.container}>
              <StatusBar
                barStyle="light-content"
                backgroundColor={theme.colors.primary}
                translucent={false}
              />
              <AppNavigator />
            </SafeAreaView>
          </NavigationContainer>
        </PaperProvider>
      </PersistGate>
    </ReduxProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default App;