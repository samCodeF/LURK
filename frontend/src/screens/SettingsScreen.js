/**
 * Settings Screen - App Configuration and User Preferences
 * Manages profile, security, notifications, premium features
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  Share,
} from 'react-native';
import {
  Surface,
  Card,
  Title,
  Paragraph,
  List,
  Button,
  Divider,
  Switch as PaperSwitch,
  Avatar,
  Chip,
  Badge,
  Modal,
  Portal,
  Provider,
  TextInput,
  RadioButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useSelector, useDispatch } from 'react-redux';

// Import components
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';

// Import Redux actions and selectors
import {
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
} from '../store/selectors';
import {
  logoutUser,
  updateProfile,
  changePassword,
  setupBiometrics,
} from '../store/slices/authSlice';
import {
  selectAutomationSettings,
  updateAutomationSettings as updatePaymentSettings,
} from '../store/slices/paymentsSlice';
import { StorageService } from '../services/StorageService';

const SettingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  // Selectors
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const automationSettings = useSelector(selectAutomationSettings);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Profile modal state
  const [editProfile, setEditProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileErrors, setProfileErrors] = useState({});

  // Password modal state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      payment_reminders: true,
      payment_confirmations: true,
      marketing: false,
      security_alerts: true,
      newsletter: false,
    },
    security: {
      biometric_enabled: false,
      auto_lock_timeout: 5,
      two_factor_auth: false,
      login_notifications: true,
    },
    ui: {
      theme: 'light',
      currency: 'INR',
      language: 'en',
      animations_enabled: true,
    },
    privacy: {
      analytics_enabled: true,
      crash_reporting: true,
      data_usage: false,
      location_tracking: false,
    },
  });

  // Biometric state
  const [biometricType, setBiometricType] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Load settings and biometric info
  useEffect(() => {
    loadSettings();
    checkBiometricAvailability();
  }, []);

  // Navigation header setup
  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Settings',
      headerStyle: {
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    });
  }, [navigation]);

  // Load settings from storage
  const loadSettings = useCallback(async () => {
    try {
      const storedSettings = await StorageService.getPreferences();
      if (storedSettings) {
        setSettings(storedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Check biometric availability
  const checkBiometricAvailability = useCallback(async () => {
    try {
      const biometricData = await StorageService.getBiometricData();
      if (biometricData) {
        setBiometricAvailable(biometricData.available || false);
        setBiometricType(biometricData.type || null);
        setSettings(prev => ({
          ...prev,
          security: {
            ...prev.security,
            biometric_enabled: biometricData.enabled || false,
          },
        }));
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (category, updates) => {
    try {
      const newSettings = {
        ...settings,
        [category]: {
          ...settings[category],
          ...updates,
        },
      };
      setSettings(newSettings);
      await StorageService.updatePreferences(newSettings);

      // Update biometric settings if changed
      if (category === 'security' && 'biometric_enabled' in updates) {
        if (updates.biometric_enabled) {
          await dispatch(setupBiometrics()).unwrap();
          Alert.alert('Success', 'Biometric authentication enabled!');
        } else {
          await StorageService.removeBiometricData();
          Alert.alert('Success', 'Biometric authentication disabled.');
        }
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    }
  }, [settings, dispatch]);

  // Handle profile update
  const handleProfileUpdate = useCallback(async () => {
    const errors = {};

    if (!editProfile.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!editProfile.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(editProfile.email)) {
      errors.email = 'Invalid email format';
    }

    if (editProfile.phone && !/^\d{10}$/.test(editProfile.phone.replace(/\D/g, ''))) {
      errors.phone = 'Invalid phone number';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    try {
      await dispatch(updateProfile(editProfile)).unwrap();
      await StorageService.updateUserData(editProfile);
      setShowProfileModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  }, [dispatch, editProfile]);

  // Handle password change
  const handlePasswordChange = useCallback(async () => {
    const errors = {};

    if (!passwordData.current_password) {
      errors.current_password = 'Current password is required';
    }

    if (!passwordData.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }

    if (!passwordData.confirm_password) {
      errors.confirm_password = 'Please confirm your new password';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      await dispatch(changePassword(passwordData)).unwrap();
      setShowPasswordModal(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      Alert.alert('Success', 'Password changed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please check your current password.');
    }
  }, [dispatch, passwordData]);

  // Handle logout
  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logoutUser());
            // Navigation will be handled by auth state change
          },
        },
      ],
    );
  }, [dispatch]);

  // Handle delete account
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: () => {} },
      ],
    );
  }, []);

  // Handle share app
  const handleShareApp = useCallback(async () => {
    try {
      await Share.share({
        message: 'Check out Lurk - The smart credit card automation app that helps you save on interest charges! Download now and extend your interest-free period up to 60 days.',
        url: 'https://play.google.com/store/apps/details?id=com.lurk.app',
        title: 'Lurk - Smart Credit Card Automation',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  }, []);

  // Handle rate app
  const handleRateApp = useCallback(() => {
    Linking.openURL('https://play.google.com/store/apps/details?id=com.lurk.app');
  }, []);

  // Render user profile section
  const renderProfileSection = () => {
    return (
      <Surface style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Avatar.Text
            size={60}
            label={user?.name?.charAt(0)?.toUpperCase() || 'U'}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Title style={styles.userName}>{user?.name || 'User'}</Title>
            <Paragraph style={styles.userEmail}>{user?.email || 'user@example.com'}</Paragraph>
            <Chip icon="crown" textStyle={styles.subscriptionText}>
              {user?.subscription_tier || 'Free'} Plan
            </Chip>
          </View>
          <TouchableOpacity
            onPress={() => setShowProfileModal(true)}
            style={styles.editButton}
          >
            <Icon name="pencil" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </Surface>
    );
  };

  // Render settings section
  const renderSettingsSection = (title, icon, items, category) => {
    return (
      <Surface style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Icon name={icon} size={24} color="#4A90E2" />
          <Title style={styles.settingsTitle}>{title}</Title>
        </View>

        <Divider style={styles.settingsDivider} />

        {items.map((item, index) => {
          if (item.type === 'switch') {
            return (
              <List.Item
                key={item.key}
                title={item.title}
                description={item.description}
                left={(props) => <List.Icon {...props} icon={item.icon} />}
                right={() => (
                  <PaperSwitch
                    value={settings[category]?.[item.key] || false}
                    onValueChange={(value) => updateSettings(category, { [item.key]: value })}
                  />
                )}
                style={styles.settingsItem}
              />
            );
          }

          if (item.type === 'button') {
            return (
              <TouchableOpacity
                key={item.key}
                onPress={item.onPress}
                style={styles.settingsItemButton}
              >
                <View style={styles.buttonContent}>
                  <Icon name={item.icon} size={24} color="#666" />
                  <View style={styles.buttonText}>
                    <Text style={styles.buttonTitle}>{item.title}</Text>
                    <Text style={styles.buttonDescription}>{item.description}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#CCCCCC" />
                </View>
              </TouchableOpacity>
            );
          }

          if (item.type === 'selector') {
            return (
              <List.Item
                key={item.key}
                title={item.title}
                description={item.description}
                left={(props) => <List.Icon {...props} icon={item.icon} />}
                right={() => (
                  <View style={styles.selectorContent}>
                    <Text style={styles.selectorValue}>
                      {settings[category]?.[item.key] || item.options[0]}
                    </Text>
                    <Icon name="chevron-right" size={20} color="#CCCCCC" />
                  </View>
                )}
                onPress={() => item.onPress(item.key)}
                style={styles.settingsItem}
              />
            );
          }

          return null;
        })}
      </Surface>
    );
  };

  // Render profile modal
  const renderProfileModal = () => {
    return (
      <Portal>
        <Modal
          visible={showProfileModal}
          onDismiss={() => setShowProfileModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Edit Profile</Title>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput
              mode="outlined"
              value={editProfile.name}
              onChangeText={(text) => {
                setEditProfile({ ...editProfile, name: text });
                if (profileErrors.name) {
                  setProfileErrors({ ...profileErrors, name: '' });
                }
              }}
              error={!!profileErrors.name}
              style={styles.formInput}
            />
            {profileErrors.name && (
              <Text style={styles.errorText}>{profileErrors.name}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              mode="outlined"
              value={editProfile.email}
              onChangeText={(text) => {
                setEditProfile({ ...editProfile, email: text });
                if (profileErrors.email) {
                  setProfileErrors({ ...profileErrors, email: '' });
                }
              }}
              error={!!profileErrors.email}
              keyboardType="email-address"
              style={styles.formInput}
            />
            {profileErrors.email && (
              <Text style={styles.errorText}>{profileErrors.email}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Phone</Text>
            <TextInput
              mode="outlined"
              value={editProfile.phone}
              onChangeText={(text) => {
                setEditProfile({ ...editProfile, phone: text });
                if (profileErrors.phone) {
                  setProfileErrors({ ...profileErrors, phone: '' });
                }
              }}
              error={!!profileErrors.phone}
              keyboardType="phone-pad"
              style={styles.formInput}
              placeholder="+91 98765 43210"
            />
            {profileErrors.phone && (
              <Text style={styles.errorText}>{profileErrors.phone}</Text>
            )}
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowProfileModal(false)}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleProfileUpdate}
              loading={authLoading}
              style={styles.saveButton}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Render password modal
  const renderPasswordModal = () => {
    return (
      <Portal>
        <Modal
          visible={showPasswordModal}
          onDismiss={() => setShowPasswordModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Change Password</Title>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Current Password</Text>
            <TextInput
              mode="outlined"
              value={passwordData.current_password}
              onChangeText={(text) => {
                setPasswordData({ ...passwordData, current_password: text });
                if (passwordErrors.current_password) {
                  setPasswordErrors({ ...passwordErrors, current_password: '' });
                }
              }}
              error={!!passwordErrors.current_password}
              secureTextEntry
              style={styles.formInput}
            />
            {passwordErrors.current_password && (
              <Text style={styles.errorText}>{passwordErrors.current_password}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>New Password</Text>
            <TextInput
              mode="outlined"
              value={passwordData.new_password}
              onChangeText={(text) => {
                setPasswordData({ ...passwordData, new_password: text });
                if (passwordErrors.new_password) {
                  setPasswordErrors({ ...passwordErrors, new_password: '' });
                }
              }}
              error={!!passwordErrors.new_password}
              secureTextEntry
              style={styles.formInput}
            />
            {passwordErrors.new_password && (
              <Text style={styles.errorText}>{passwordErrors.new_password}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Confirm New Password</Text>
            <TextInput
              mode="outlined"
              value={passwordData.confirm_password}
              onChangeText={(text) => {
                setPasswordData({ ...passwordData, confirm_password: text });
                if (passwordErrors.confirm_password) {
                  setPasswordErrors({ ...passwordErrors, confirm_password: '' });
                }
              }}
              error={!!passwordErrors.confirm_password}
              secureTextEntry
              style={styles.formInput}
            />
            {passwordErrors.confirm_password && (
              <Text style={styles.errorText}>{passwordErrors.confirm_password}</Text>
            )}
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => {
                setShowPasswordModal(false);
                setPasswordData({
                  current_password: '',
                  new_password: '',
                  confirm_password: '',
                });
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handlePasswordChange}
              loading={authLoading}
              style={styles.saveButton}
            >
              Change Password
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Surface style={styles.notAuthenticatedCard}>
          <Icon name="login" size={64} color="#CCCCCC" />
          <Title style={styles.notAuthenticatedTitle}>Not Logged In</Title>
          <Paragraph style={styles.notAuthenticatedText}>
            Please log in to access settings and manage your account.
          </Paragraph>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
          >
            Login
          </Button>
        </Surface>
      </View>
    );
  }

  const notificationItems = [
    {
      type: 'switch',
      key: 'payment_reminders',
      title: 'Payment Reminders',
      description: 'Get notified about upcoming payments',
      icon: 'bell-outline',
    },
    {
      type: 'switch',
      key: 'payment_confirmations',
      title: 'Payment Confirmations',
      description: 'Receive confirmations for successful payments',
      icon: 'check-circle-outline',
    },
    {
      type: 'switch',
      key: 'security_alerts',
      title: 'Security Alerts',
      description: 'Important security notifications',
      icon: 'shield-alert-outline',
    },
    {
      type: 'switch',
      key: 'marketing',
      title: 'Marketing Emails',
      description: 'Promotional offers and updates',
      icon: 'email-outline',
    },
  ];

  const securityItems = [
    {
      type: 'switch',
      key: 'biometric_enabled',
      title: 'Biometric Authentication',
      description: biometricAvailable ? `Use ${biometricType || 'biometric'} to login` : 'Not available on this device',
      icon: 'fingerprint',
      disabled: !biometricAvailable,
    },
    {
      type: 'selector',
      key: 'auto_lock_timeout',
      title: 'Auto-Lock Timeout',
      description: 'App locks automatically after inactivity',
      icon: 'lock-clock',
      options: ['1', '5', '10', '15', '30'],
      onPress: (key) => {
        // Show timeout selector modal
        Alert.alert(
          'Auto-Lock Timeout',
          'Select auto-lock timeout in minutes:',
          ['1 minute', '5 minutes', '10 minutes', '15 minutes', '30 minutes', 'Cancel'].map((option, index) => ({
            text: option,
            onPress: () => {
              if (index < 5) {
                updateSettings('security', { [key]: index === 0 ? 1 : index === 1 ? 5 : index === 2 ? 10 : index === 3 ? 15 : 30 });
              }
            },
          })),
        );
      },
    },
    {
      type: 'button',
      key: 'change_password',
      title: 'Change Password',
      description: 'Update your account password',
      icon: 'lock-outline',
      onPress: () => setShowPasswordModal(true),
    },
  ];

  const generalItems = [
    {
      type: 'selector',
      key: 'theme',
      title: 'Theme',
      description: 'Choose app appearance',
      icon: 'theme-light-dark',
      options: ['light', 'dark', 'system'],
      onPress: (key) => {
        Alert.alert(
          'Theme',
          'Select app theme:',
          ['Light', 'Dark', 'System Default', 'Cancel'].map((option, index) => ({
            text: option,
            onPress: () => {
              if (index < 3) {
                updateSettings('ui', { [key]: ['light', 'dark', 'system'][index] });
              }
            },
          })),
        );
      },
    },
    {
      type: 'selector',
      key: 'currency',
      title: 'Currency',
      description: 'Display currency format',
      icon: 'currency-inr',
      options: ['INR', 'USD', 'EUR'],
      onPress: (key) => {
        Alert.alert(
          'Currency',
          'Select display currency:',
          ['₹ INR', '$ USD', '€ EUR', 'Cancel'].map((option, index) => ({
            text: option,
            onPress: () => {
              if (index < 3) {
                updateSettings('ui', { [key]: ['INR', 'USD', 'EUR'][index] });
              }
            },
          })),
        );
      },
    },
  ];

  const aboutItems = [
    {
      type: 'button',
      key: 'share',
      title: 'Share Lurk',
      description: 'Share the app with friends',
      icon: 'share-variant',
      onPress: handleShareApp,
    },
    {
      type: 'button',
      key: 'rate',
      title: 'Rate App',
      description: 'Rate us on Google Play Store',
      icon: 'star-outline',
      onPress: handleRateApp,
    },
    {
      type: 'button',
      key: 'privacy',
      title: 'Privacy Policy',
      description: 'Read our privacy policy',
      icon: 'shield-outline',
      onPress: () => Linking.openURL('https://lurk.app/privacy'),
    },
    {
      type: 'button',
      key: 'terms',
      title: 'Terms of Service',
      description: 'Read our terms and conditions',
      icon: 'file-document-outline',
      onPress: () => Linking.openURL('https://lurk.app/terms'),
    },
    {
      type: 'button',
      key: 'support',
      title: 'Support',
      description: 'Get help and contact us',
      icon: 'help-circle-outline',
      onPress: () => Linking.openURL('mailto:support@lurk.app'),
    },
  ];

  const dangerItems = [
    {
      type: 'button',
      key: 'logout',
      title: 'Logout',
      description: 'Sign out of your account',
      icon: 'logout',
      onPress: handleLogout,
    },
    {
      type: 'button',
      key: 'delete',
      title: 'Delete Account',
      description: 'Permanently delete your account',
      icon: 'delete-forever',
      onPress: handleDeleteAccount,
    },
  ];

  return (
    <Provider>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {renderProfileSection()}

        <View style={styles.settingsContainer}>
          {renderSettingsSection('Notifications', 'bell-outline', notificationItems, 'notifications')}
          {renderSettingsSection('Security', 'shield-outline', securityItems, 'security')}
          {renderSettingsSection('General', 'cog-outline', generalItems, 'ui')}
          {renderSettingsSection('About', 'information-outline', aboutItems, null)}

          <Surface style={styles.dangerCard}>
            <View style={styles.dangerHeader}>
              <Icon name="alert-circle" size={24} color="#F44336" />
              <Title style={styles.dangerTitle}>Danger Zone</Title>
            </View>
            <Divider style={styles.dangerDivider} />
            {dangerItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={item.onPress}
                style={styles.dangerItem}
              >
                <Icon name={item.icon} size={24} color="#F44336" />
                <View style={styles.dangerText}>
                  <Text style={styles.dangerItemTitle}>{item.title}</Text>
                  <Text style={styles.dangerItemDescription}>{item.description}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#F44336" />
              </TouchableOpacity>
            ))}
          </Surface>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Lurk v1.0.0</Text>
          <Text style={styles.footerText}>© 2024 Lurk Technologies Pvt. Ltd.</Text>
        </View>

        {/* Modals */}
        {renderProfileModal()}
        {renderPasswordModal()}
      </ScrollView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#4A90E2',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  subscriptionText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  settingsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 12,
  },
  settingsDivider: {
    backgroundColor: '#E0E0E0',
  },
  settingsItem: {
    paddingHorizontal: 20,
  },
  settingsItemButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    flex: 1,
    marginLeft: 16,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorValue: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  dangerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginLeft: 12,
  },
  dangerDivider: {
    backgroundColor: '#F44336',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5E5',
  },
  dangerText: {
    flex: 1,
    marginLeft: 16,
  },
  dangerItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 2,
  },
  dangerItemDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  formInput: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  notAuthenticatedCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 32,
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notAuthenticatedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  notAuthenticatedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#4A90E2',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});

export default SettingsScreen;