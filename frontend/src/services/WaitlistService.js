import { ApiService } from './ApiService';
import { Alert, Platform } from 'react-native';

export class WaitlistService {
  // Email validation regex
  static emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - True if email is valid
   */
  static validateEmail(email) {
    return this.emailRegex.test(email.trim());
  }

  /**
   * Join waitlist with email
   * @param {string} email - User's email address
   * @param {Object} options - Additional options (source, metadata, etc.)
   * @returns {Promise<Object>} - Result of waitlist signup
   */
  static async joinWaitlist(email, options = {}) {
    try {
      // Validate email
      if (!email || !this.validateEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Prepare request data
      const waitlistData = {
        email: email.trim().toLowerCase(),
        source: options.source || 'landing_page',
        metadata: {
          platform: Platform.OS,
          userAgent: Platform.OS === 'web' ? navigator.userAgent : null,
          timestamp: new Date().toISOString(),
          ...options.metadata,
        },
        preferences: {
          newsletter: options.newsletter !== false, // Default to true
          product_updates: options.productUpdates !== false,
        },
      };

      // Make API call
      const response = await ApiService.post('/waitlist', waitlistData);

      return {
        success: true,
        data: response.data,
        message: 'You\'ve been added to the waitlist successfully!',
      };

    } catch (error) {
      console.error('Waitlist signup error:', error);

      // Handle different error types
      if (error.message === 'Please enter a valid email address') {
        return {
          success: false,
          error: error.message,
          code: 'INVALID_EMAIL',
        };
      }

      if (error.response?.status === 409) {
        return {
          success: false,
          error: 'Email already exists on waitlist',
          code: 'EMAIL_EXISTS',
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT',
        };
      }

      if (error.response?.status >= 500) {
        return {
          success: false,
          error: 'Server temporarily unavailable. Please try again later.',
          code: 'SERVER_ERROR',
        };
      }

      // Network errors
      if (!error.response) {
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.',
          code: 'NETWORK_ERROR',
        };
      }

      return {
        success: false,
        error: 'Failed to join waitlist. Please try again.',
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Get waitlist position/rank
   * @param {string} email - User's email address
   * @returns {Promise<Object>} - Waitlist position info
   */
  static async getWaitlistPosition(email) {
    try {
      if (!email || !this.validateEmail(email)) {
        throw new Error('Invalid email address');
      }

      const response = await ApiService.get(`/waitlist/position/${encodeURIComponent(email)}`);

      return {
        success: true,
        data: response.data,
      };

    } catch (error) {
      console.error('Get waitlist position error:', error);

      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Email not found on waitlist',
          code: 'NOT_FOUND',
        };
      }

      return {
        success: false,
        error: 'Failed to get waitlist position',
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Update waitlist preferences
   * @param {string} email - User's email address
   * @param {Object} preferences - Updated preferences
   * @returns {Promise<Object>} - Result of update
   */
  static async updatePreferences(email, preferences) {
    try {
      if (!email || !this.validateEmail(email)) {
        throw new Error('Invalid email address');
      }

      const response = await ApiService.put(`/waitlist/preferences/${encodeURIComponent(email)}`, {
        preferences,
      });

      return {
        success: true,
        data: response.data,
        message: 'Preferences updated successfully',
      };

    } catch (error) {
      console.error('Update preferences error:', error);

      return {
        success: false,
        error: 'Failed to update preferences',
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Remove email from waitlist
   * @param {string} email - User's email address
   * @returns {Promise<Object>} - Result of removal
   */
  static async removeFromWaitlist(email) {
    try {
      if (!email || !this.validateEmail(email)) {
        throw new Error('Invalid email address');
      }

      await ApiService.delete(`/waitlist/${encodeURIComponent(email)}`);

      return {
        success: true,
        message: 'Removed from waitlist successfully',
      };

    } catch (error) {
      console.error('Remove from waitlist error:', error);

      return {
        success: false,
        error: 'Failed to remove from waitlist',
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Show success message
   * @param {string} message - Success message to show
   */
  static showSuccessMessage(message) {
    Alert.alert(
      'Success!',
      message,
      [{ text: 'OK', style: 'default' }],
      { cancelable: false }
    );
  }

  /**
   * Show error message
   * @param {string} message - Error message to show
   */
  static showErrorMessage(message) {
    Alert.alert(
      'Error',
      message,
      [{ text: 'OK', style: 'default' }],
      { cancelable: false }
    );
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback when confirmed
   */
  static showConfirmation(message, onConfirm) {
    Alert.alert(
      'Confirm',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: onConfirm,
          style: 'default',
        },
      ],
      { cancelable: false }
    );
  }

  /**
   * Format waitlist position for display
   * @param {number} position - Position number
   * @returns {string} - Formatted position with suffix
   */
  static formatPosition(position) {
    if (!position || position <= 0) return 'N/A';

    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = position % 100;
    const suffix = suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];

    return `${position}${suffix}`;
  }

  /**
   * Generate unique device identifier for tracking
   * @returns {string} - Unique device ID
   */
  static generateDeviceId() {
    if (Platform.OS === 'web') {
      return `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } else {
      return `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Check if user has already joined waitlist (local storage check)
   * @returns {boolean} - True if already joined
   */
  static hasJoinedWaitlist() {
    // This would integrate with StorageService
    // For now, return false to allow re-joining during testing
    return false;
  }

  /**
   * Mark user as joined waitlist (local storage)
   * @param {string} email - User's email
   */
  static markAsJoinedWaitlist(email) {
    // This would integrate with StorageService
    console.log(`Marked ${email} as joined waitlist`);
  }
}