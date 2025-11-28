import React, { useState } from 'react';
import { View, StyleSheet, Modal, Text, TextInput, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { WaitlistService } from '../services/WaitlistService';
import { colors, spacing, borderRadius, useResponsive } from '../styles';

const { width } = Dimensions.get('window');

const WaitlistButton = ({
  children,
  style,
  mode = 'contained',
  size = 'medium',
  source = 'landing_page',
  onSuccess,
  onError,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const { isMobile } = useResponsive();

  const handlePress = () => {
    setIsVisible(true);
    setEmail(''); // Reset email when modal opens
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsVisible(false);
      setEmail('');
    }
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      WaitlistService.showErrorMessage('Please enter your email address');
      return;
    }

    if (!WaitlistService.validateEmail(email)) {
      WaitlistService.showErrorMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await WaitlistService.joinWaitlist(email, {
        source,
        newsletter,
        productUpdates,
        metadata: {
          button_size: size,
          button_mode: mode,
          source_component: 'WaitlistButton',
        },
      });

      if (result.success) {
        WaitlistService.showSuccessMessage(result.message);
        setIsVisible(false);
        setEmail('');
        WaitlistService.markAsJoinedWaitlist(email);
        onSuccess?.(result.data);
      } else {
        // Handle specific error types
        switch (result.code) {
          case 'EMAIL_EXISTS':
            WaitlistService.showErrorMessage(
              'You\'re already on the waitlist! Check your email for updates.'
            );
            break;
          case 'RATE_LIMIT':
            WaitlistService.showErrorMessage(result.error);
            break;
          case 'SERVER_ERROR':
            WaitlistService.showErrorMessage(
              'Our servers are having issues. Please try again in a few minutes.'
            );
            break;
          case 'NETWORK_ERROR':
            WaitlistService.showErrorMessage(result.error);
            break;
          default:
            WaitlistService.showErrorMessage(result.error);
        }
        onError?.(result.error);
      }
    } catch (error) {
      WaitlistService.showErrorMessage('An unexpected error occurred. Please try again.');
      onError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return {
          height: 40,
          paddingHorizontal: spacing.md,
        };
      case 'large':
        return {
          height: 64,
          paddingHorizontal: spacing.xl,
        };
      default:
        return {
          height: 56,
          paddingHorizontal: spacing.lg,
        };
    }
  };

  const getButtonTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <>
      <Button
        mode={mode}
        onPress={handlePress}
        style={[
          styles.button,
          getButtonSize(),
          style,
        ]}
        contentStyle={getButtonSize()}
        labelStyle={[
          styles.buttonText,
          { fontSize: getButtonTextSize() },
        ]}
        disabled={isLoading}
        loading={isLoading}
        {...props}
      >
        {children}
      </Button>

      {/* Waitlist Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, isMobile && styles.mobileModal]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>L</Text>
                </View>
                <Text style={styles.modalTitle}>Join the Waitlist</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={styles.modalDescription}>
              Get early access to Lurk and never pay credit card interest again.
              Join thousands of smart spenders on our waitlist.
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.emailInput}
                placeholder="Enter your email"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Preferences */}
            <View style={styles.preferencesContainer}>
              <TouchableOpacity
                style={styles.preferenceItem}
                onPress={() => setNewsletter(!newsletter)}
                disabled={isLoading}
              >
                <View style={[styles.checkbox, newsletter && styles.checkboxChecked]}>
                  {newsletter && (
                    <Ionicons name="checkmark" size={16} color={colors.background} />
                  )}
                </View>
                <Text style={styles.preferenceText}>
                  Send me product updates and news
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.preferenceItem}
                onPress={() => setProductUpdates(!productUpdates)}
                disabled={isLoading}
              >
                <View style={[styles.checkbox, productUpdates && styles.checkboxChecked]}>
                  {productUpdates && (
                    <Ionicons name="checkmark" size={16} color={colors.background} />
                  )}
                </View>
                <Text style={styles.preferenceText}>
                  Notify me when early access is available
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
              labelStyle={styles.submitButtonText}
              loading={isLoading}
              disabled={isLoading || !email.trim()}
            >
              Join Waitlist
            </Button>

            {/* Footer */}
            <Text style={styles.modalFooter}>
              No spam, ever. Unsubscribe at any time.
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.full,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background + '99',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  mobileModal: {
    marginHorizontal: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background,
    fontFamily: 'Inter',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: 'Inter',
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.mutedForeground,
    lineHeight: 24,
    marginBottom: spacing.xl,
    fontFamily: 'Inter',
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  emailInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.foreground,
    fontFamily: 'Inter',
  },
  preferencesContainer: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  preferenceText: {
    fontSize: 14,
    color: colors.foreground,
    fontFamily: 'Inter',
    flex: 1,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  submitButtonContent: {
    paddingVertical: spacing.md,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    fontFamily: 'Inter',
  },
  modalFooter: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
});

export default WaitlistButton;