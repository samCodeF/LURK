/**
 * Storage Service for Lurk - Local Data Management
 * Handles secure storage of tokens, user data, and preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  // Token Storage
  static async storeTokens({ access_token, refresh_token }) {
    try {
      const tokens = {
        access_token,
        refresh_token,
        stored_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@lurk_tokens', JSON.stringify(tokens));
      return true;
    } catch (error) {
      console.error('Error storing tokens:', error);
      return false;
    }
  }

  static async getTokens() {
    try {
      const tokensJson = await AsyncStorage.getItem('@lurk_tokens');
      if (tokensJson) {
        return JSON.parse(tokensJson);
      }
      return null;
    } catch (error) {
      console.error('Error getting tokens:', error);
      return null;
    }
  }

  static async removeTokens() {
    try {
      await AsyncStorage.removeItem('@lurk_tokens');
      return true;
    } catch (error) {
      console.error('Error removing tokens:', error);
      return false;
    }
  }

  // User Data Storage
  static async storeUserData(userData) {
    try {
      const dataToStore = {
        ...userData,
        stored_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@lurk_user_data', JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      console.error('Error storing user data:', error);
      return false;
    }
  }

  static async getUserData() {
    try {
      const userDataJson = await AsyncStorage.getItem('@lurk_user_data');
      if (userDataJson) {
        return JSON.parse(userDataJson);
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  static async removeUserData() {
    try {
      await AsyncStorage.removeItem('@lurk_user_data');
      return true;
    } catch (error) {
      console.error('Error removing user data:', error);
      return false;
    }
  }

  static async updateUserData(updates) {
    try {
      const currentData = await StorageService.getUserData();
      if (currentData) {
        const updatedData = { ...currentData, ...updates };
        return await StorageService.storeUserData(updatedData);
      }
      return false;
    } catch (error) {
      console.error('Error updating user data:', error);
      return false;
    }
  }

  // Biometric Data Storage
  static async storeBiometricData(biometricData) {
    try {
      const dataToStore = {
        ...biometricData,
        stored_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@lurk_biometric', JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      console.error('Error storing biometric data:', error);
      return false;
    }
  }

  static async getBiometricData() {
    try {
      const biometricJson = await AsyncStorage.getItem('@lurk_biometric');
      if (biometricJson) {
        return JSON.parse(biometricJson);
      }
      return null;
    } catch (error) {
      console.error('Error getting biometric data:', error);
      return null;
    }
  }

  static async removeBiometricData() {
    try {
      await AsyncStorage.removeItem('@lurk_biometric');
      return true;
    } catch (error) {
      console.error('Error removing biometric data:', error);
      return false;
    }
  }

  // KYC Data Storage
  static async storeKycData(kycData) {
    try {
      const dataToStore = {
        ...kycData,
        stored_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@lurk_kyc', JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      console.error('Error storing KYC data:', error);
      return false;
    }
  }

  static async getKycData() {
    try {
      const kycJson = await AsyncStorage.getItem('@lurk_kyc');
      if (kycJson) {
        return JSON.parse(kycJson);
      }
      return null;
    } catch (error) {
      console.error('Error getting KYC data:', error);
      return null;
    }
  }

  static async removeKycData() {
    try {
      await AsyncStorage.removeItem('@lurk_kyc');
      return true;
    } catch (error) {
      console.error('Error removing KYC data:', error);
      return false;
    }
  }

  // Preferences Storage
  static async storePreferences(preferences) {
    try {
      const dataToStore = {
        ...preferences,
        updated_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@lurk_preferences', JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      console.error('Error storing preferences:', error);
      return false;
    }
  }

  static async getPreferences() {
    try {
      const prefsJson = await AsyncStorage.getItem('@lurk_preferences');
      if (prefsJson) {
        return JSON.parse(prefsJson);
      }
      return {
        // Default preferences
        notifications: {
          payment_reminders: true,
          payment_confirmations: true,
          marketing: false,
        },
        security: {
          biometric_enabled: false,
          auto_lock_timeout: 5, // minutes
        },
        ui: {
          theme: 'light',
          currency: 'INR',
          language: 'en',
        },
      };
    } catch (error) {
      console.error('Error getting preferences:', error);
      return null;
    }
  }

  static async updatePreferences(updates) {
    try {
      const currentPrefs = await StorageService.getPreferences();
      if (currentPrefs) {
        const updatedPrefs = { ...currentPrefs, ...updates };
        return await StorageService.storePreferences(updatedPrefs);
      }
      return false;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }

  // Card Data Storage (for offline capability)
  static async storeCardsData(cards) {
    try {
      const dataToStore = {
        cards,
        last_updated: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@lurk_cards', JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      console.error('Error storing cards data:', error);
      return false;
    }
  }

  static async getCardsData() {
    try {
      const cardsJson = await AsyncStorage.getItem('@lurk_cards');
      if (cardsJson) {
        return JSON.parse(cardsJson);
      }
      return { cards: [], last_updated: null };
    } catch (error) {
      console.error('Error getting cards data:', error);
      return { cards: [], last_updated: null };
    }
  }

  static async removeCardsData() {
    try {
      await AsyncStorage.removeItem('@lurk_cards');
      return true;
    } catch (error) {
      console.error('Error removing cards data:', error);
      return false;
    }
  }

  // Analytics Data Storage (for offline analytics)
  static async storeAnalyticsData(analyticsData) {
    try {
      const dataToStore = {
        ...analyticsData,
        stored_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@lurk_analytics', JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      console.error('Error storing analytics data:', error);
      return false;
    }
  }

  static async getAnalyticsData() {
    try {
      const analyticsJson = await AsyncStorage.getItem('@lurk_analytics');
      if (analyticsJson) {
        return JSON.parse(analyticsJson);
      }
      return null;
    } catch (error) {
      console.error('Error getting analytics data:', error);
      return null;
    }
  }

  // App State Management
  static async clearAuthData() {
    try {
      await AsyncStorage.multiRemove([
        '@lurk_tokens',
        '@lurk_user_data',
        '@lurk_biometric',
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  }

  static async clearAllData() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }

  // Debug methods
  static async getAllStoredData() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const data = {};

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        data[key] = value;
      }

      return data;
    } catch (error) {
      console.error('Error getting all stored data:', error);
      return {};
    }
  }

  // Migration and cleanup
  static async migrateFromOldKeys() {
    try {
      // This would handle migration from old key formats
      const oldKeys = ['auth_tokens', 'user_info', 'app_preferences'];

      for (const oldKey of oldKeys) {
        const oldValue = await AsyncStorage.getItem(oldKey);
        if (oldValue) {
          // Migrate to new key format
          switch (oldKey) {
            case 'auth_tokens':
              await StorageService.storeTokens(JSON.parse(oldValue));
              break;
            case 'user_info':
              await StorageService.storeUserData(JSON.parse(oldValue));
              break;
            case 'app_preferences':
              await StorageService.storePreferences(JSON.parse(oldValue));
              break;
          }

          // Remove old key
          await AsyncStorage.removeItem(oldKey);
        }
      }

      return true;
    } catch (error) {
      console.error('Error migrating old data:', error);
      return false;
    }
  }

  // Validation
  static async validateStoredData() {
    try {
      const tokens = await StorageService.getTokens();
      const userData = await StorageService.getUserData();

      const issues = [];

      if (tokens && !tokens.access_token) {
        issues.push('Missing access token');
      }

      if (tokens && tokens.stored_at) {
        const storedDate = new Date(tokens.stored_at);
        const daysOld = Math.floor((new Date() - storedDate) / (1000 * 60 * 60 * 24));
        if (daysOld > 30) {
          issues.push('Token data is old');
        }
      }

      return {
        is_valid: issues.length === 0,
        issues,
        token_age_days: tokens?.stored_at ? daysOld : null,
      };
    } catch (error) {
      console.error('Error validating stored data:', error);
      return {
        is_valid: false,
        issues: ['Validation error'],
      };
    }
  }
}

export default StorageService;