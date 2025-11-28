/**
 * Login Screen - User Authentication
 * Handles login, registration, and biometric authentication
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import {
  Surface,
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Checkbox,
  HelperText,
  Portal,
  Modal,
  ProgressBar,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useSelector, useDispatch } from 'react-redux';

// Import components
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';

// Import services
import NotificationService from '../services/NotificationService';
import StorageService from '../services/StorageService';

// Import Redux actions and selectors
import {
  loginUser,
  registerUser,
  socialLogin,
  setupBiometrics,
  verifyBiometrics,
  refreshToken as refreshAuthToken,
  selectAuthLoading,
  selectAuthError,
  selectIsAuthenticated,
} from '../store/slices/authSlice';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  // Selectors
  const authLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Local state
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [loginErrors, setLoginErrors] = useState({});

  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
    allowMarketing: false,
  });
  const [registerErrors, setRegisterErrors] = useState({});

  // Modal states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  // Initialize and check biometric availability
  useEffect(() => {
    checkBiometricAvailability();
    loadSavedCredentials();
  }, []);

  // Handle navigation when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('MainApp');
    }
  }, [isAuthenticated, navigation]);

  // Navigation header setup
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Check biometric availability
  const checkBiometricAvailability = useCallback(async () => {
    try {
      const biometricData = await StorageService.getBiometricData();
      const available = !!biometricData?.available;
      const enabled = !!biometricData?.enabled;

      setBiometricAvailable(available);
      setBiometricEnabled(enabled);

      console.log('Biometric status:', { available, enabled });
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  }, []);

  // Load saved credentials
  const loadSavedCredentials = useCallback(async () => {
    try {
      const userData = await StorageService.getUserData();
      const tokens = await StorageService.getTokens();

      if (tokens && userData?.remember_me) {
        setLoginForm({
          email: userData.email || '',
          password: '', // Never store password
        });
        setRememberMe(true);

        // Show biometric prompt if available and enabled
        if (biometricEnabled) {
          setShowBiometricPrompt(true);
        }
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  }, [biometricEnabled]);

  // Validate login form
  const validateLoginForm = useCallback(() => {
    const errors = {};

    if (!loginForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(loginForm.email)) {
      errors.email = 'Invalid email format';
    }

    if (!loginForm.password) {
      errors.password = 'Password is required';
    }

    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  }, [loginForm]);

  // Validate registration form
  const validateRegisterForm = useCallback(() => {
    const errors = {};

    if (!registerForm.name.trim()) {
      errors.name = 'Name is required';
    } else if (registerForm.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!registerForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(registerForm.email)) {
      errors.email = 'Invalid email format';
    }

    if (!registerForm.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(registerForm.phone.replace(/\D/g, ''))) {
      errors.phone = 'Invalid phone number (must be 10 digits)';
    }

    if (!registerForm.password) {
      errors.password = 'Password is required';
    } else if (registerForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(registerForm.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!registerForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!registerForm.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the Terms of Service';
    }

    if (!registerForm.agreeToPrivacy) {
      errors.agreeToPrivacy = 'You must agree to the Privacy Policy';
    }

    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  }, [registerForm]);

  // Handle login
  const handleLogin = useCallback(async () => {
    if (!validateLoginForm()) {
      return;
    }

    try {
      const result = await dispatch(loginUser(loginForm)).unwrap();

      // Save credentials if remember me is checked
      if (rememberMe) {
        await StorageService.updateUserData({
          email: loginForm.email,
          remember_me: true,
        });
      } else {
        await StorageService.updateUserData({
          email: '',
          remember_me: false,
        });
      }

      // Initialize notifications
      await NotificationService.initialize();

      console.log('Login successful:', result);
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert(
        'Login Failed',
        error.message || 'Invalid email or password. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [dispatch, loginForm, rememberMe, validateLoginForm]);

  // Handle registration
  const handleRegister = useCallback(async () => {
    if (!validateRegisterForm()) {
      return;
    }

    try {
      const userData = {
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.replace(/\D/g, ''),
        password: registerForm.password,
        allow_marketing: registerForm.allowMarketing,
      };

      const result = await dispatch(registerUser(userData)).unwrap();

      // Save basic user data
      await StorageService.storeUserData({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        remember_me: true,
      });

      // Initialize notifications
      await NotificationService.initialize();

      console.log('Registration successful:', result);
    } catch (error) {
      console.error('Registration failed:', error);
      Alert.alert(
        'Registration Failed',
        error.message || 'Unable to create account. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [dispatch, registerForm, validateRegisterForm]);

  // Handle social login
  const handleSocialLogin = useCallback(async (provider) => {
    try {
      const result = await dispatch(socialLogin(provider)).unwrap();

      // Save user data
      await StorageService.storeUserData({
        name: result.user.name,
        email: result.user.email,
        avatar: result.user.avatar,
        provider,
        remember_me: true,
      });

      // Initialize notifications
      await NotificationService.initialize();

      console.log(`${provider} login successful:`, result);
    } catch (error) {
      console.error(`${provider} login failed:`, error);
      Alert.alert(
        'Login Failed',
        `Unable to login with ${provider}. Please try again.`,
        [{ text: 'OK' }]
      );
    }
  }, [dispatch]);

  // Handle biometric authentication
  const handleBiometricLogin = useCallback(async () => {
    try {
      const userData = await StorageService.getUserData();
      if (!userData || !userData.email) {
        Alert.alert(
          'Biometric Login',
          'No saved credentials found. Please login with email/password first.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await dispatch(verifyBiometrics()).unwrap();

      // Auto-login with stored email
      await dispatch(loginUser({ email: userData.email, useBiometric: true })).unwrap();

      setShowBiometricPrompt(false);
      console.log('Biometric login successful:', result);
    } catch (error) {
      console.error('Biometric login failed:', error);
      Alert.alert(
        'Biometric Login Failed',
        error.message || 'Unable to verify biometric authentication. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [dispatch]);

  // Handle forgot password
  const handleForgotPassword = useCallback(async () => {
    if (!forgotPasswordEmail.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter your email address to reset password.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      Alert.alert(
        'Invalid Email',
        'Please enter a valid email address.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // TODO: Implement forgot password API call
      console.log('Password reset requested for:', forgotPasswordEmail);

      Alert.alert(
        'Password Reset Email Sent',
        'If an account exists with this email, you will receive password reset instructions.',
        [{
          text: 'OK',
          onPress: () => {
            setShowForgotPassword(false);
            setForgotPasswordEmail('');
          }
        }]
      );
    } catch (error) {
      console.error('Forgot password failed:', error);
      Alert.alert(
        'Reset Failed',
        'Unable to send password reset email. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [forgotPasswordEmail]);

  // Setup biometric authentication
  const handleSetupBiometrics = useCallback(async () => {
    try {
      await dispatch(setupBiometrics()).unwrap();
      await checkBiometricAvailability();

      Alert.alert(
        'Biometric Authentication Enabled',
        'You can now use biometric authentication for quick login.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Biometric setup failed:', error);
      Alert.alert(
        'Setup Failed',
        error.message || 'Unable to setup biometric authentication.',
        [{ text: 'OK' }]
      );
    }
  }, [dispatch, checkBiometricAvailability]);

  // Render logo section
  const renderLogoSection = () => {
    return (
      <View style={styles.logoSection}>
        <Surface style={styles.logoContainer}>
          <Icon name="credit-card" size={64} color="#4A90E2" />
        </Surface>
        <Title style={styles.appName}>Lurk</Title>
        <Paragraph style={styles.tagline}>
          Smart Credit Card Automation
        </Paragraph>
        <Paragraph style={styles.subtagline}>
          Extend your interest-free period to 60 days
        </Paragraph>
      </View>
    );
  };

  // Render login form
  const renderLoginForm = () => {
    return (
      <Card style={styles.formCard}>
        <Title style={styles.formTitle}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </Title>

        {isLogin ? (
          <View>
            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Email"
                value={loginForm.email}
                onChangeText={(text) => {
                  setLoginForm({ ...loginForm, email: text });
                  if (loginErrors.email) {
                    setLoginErrors({ ...loginErrors, email: '' });
                  }
                }}
                error={!!loginErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email" />}
                style={styles.textInput}
              />
              <HelperText type="error" visible={!!loginErrors.email}>
                {loginErrors.email}
              </HelperText>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Password"
                value={loginForm.password}
                onChangeText={(text) => {
                  setLoginForm({ ...loginForm, password: text });
                  if (loginErrors.password) {
                    setLoginErrors({ ...loginErrors, password: '' });
                  }
                }}
                error={!!loginErrors.password}
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.textInput}
              />
              <HelperText type="error" visible={!!loginErrors.password}>
                {loginErrors.password}
              </HelperText>
            </View>

            <View style={styles.formOptions}>
              <View style={styles.checkboxRow}>
                <Checkbox
                  status={rememberMe ? 'checked' : 'unchecked'}
                  onPress={() => setRememberMe(!rememberMe)}
                />
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </View>
              <TouchableOpacity onPress={() => setShowForgotPassword(true)}>
                <Text style={styles.forgotPasswordLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={authLoading}
              disabled={authLoading}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
            >
              Login
            </Button>

            {biometricAvailable && (
              <Button
                mode="outlined"
                onPress={handleBiometricLogin}
                icon="fingerprint"
                style={styles.biometricButton}
                contentStyle={styles.buttonContent}
              >
                Login with Biometric
              </Button>
            )}
          </View>
        ) : (
          <View>
            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Full Name"
                value={registerForm.name}
                onChangeText={(text) => {
                  setRegisterForm({ ...registerForm, name: text });
                  if (registerErrors.name) {
                    setRegisterErrors({ ...registerErrors, name: '' });
                  }
                }}
                error={!!registerErrors.name}
                autoCapitalize="words"
                left={<TextInput.Icon icon="account" />}
                style={styles.textInput}
              />
              <HelperText type="error" visible={!!registerErrors.name}>
                {registerErrors.name}
              </HelperText>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Email"
                value={registerForm.email}
                onChangeText={(text) => {
                  setRegisterForm({ ...registerForm, email: text });
                  if (registerErrors.email) {
                    setRegisterErrors({ ...registerErrors, email: '' });
                  }
                }}
                error={!!registerErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email" />}
                style={styles.textInput}
              />
              <HelperText type="error" visible={!!registerErrors.email}>
                {registerErrors.email}
              </HelperText>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Phone Number"
                value={registerForm.phone}
                onChangeText={(text) => {
                  setRegisterForm({ ...registerForm, phone: text });
                  if (registerErrors.phone) {
                    setRegisterErrors({ ...registerErrors, phone: '' });
                  }
                }}
                error={!!registerErrors.phone}
                keyboardType="phone-pad"
                maxLength={10}
                left={<TextInput.Icon icon="phone" />}
                style={styles.textInput}
                placeholder="98765 43210"
              />
              <HelperText type="error" visible={!!registerErrors.phone}>
                {registerErrors.phone}
              </HelperText>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Password"
                value={registerForm.password}
                onChangeText={(text) => {
                  setRegisterForm({ ...registerForm, password: text });
                  if (registerErrors.password) {
                    setRegisterErrors({ ...registerErrors, password: '' });
                  }
                }}
                error={!!registerErrors.password}
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.textInput}
              />
              <HelperText type="error" visible={!!registerErrors.password}>
                {registerErrors.password}
              </HelperText>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                label="Confirm Password"
                value={registerForm.confirmPassword}
                onChangeText={(text) => {
                  setRegisterForm({ ...registerForm, confirmPassword: text });
                  if (registerErrors.confirmPassword) {
                    setRegisterErrors({ ...registerErrors, confirmPassword: '' });
                  }
                }}
                error={!!registerErrors.confirmPassword}
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock-check" />}
                style={styles.textInput}
              />
              <HelperText type="error" visible={!!registerErrors.confirmPassword}>
                {registerErrors.confirmPassword}
              </HelperText>
            </View>

            <View style={styles.termsSection}>
              <View style={styles.checkboxRow}>
                <Checkbox
                  status={registerForm.agreeToTerms ? 'checked' : 'unchecked'}
                  onPress={() => setRegisterForm({
                    ...registerForm,
                    agreeToTerms: !registerForm.agreeToTerms,
                  })}
                />
                <View style={styles.termsText}>
                  <Text style={styles.termsLabel}>I agree to the </Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://lurk.app/terms')}>
                    <Text style={styles.termsLink}>Terms of Service</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <HelperText type="error" visible={!!registerErrors.agreeToTerms}>
                {registerErrors.agreeToTerms}
              </HelperText>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={registerForm.agreeToPrivacy ? 'checked' : 'unchecked'}
                  onPress={() => setRegisterForm({
                    ...registerForm,
                    agreeToPrivacy: !registerForm.agreeToPrivacy,
                  })}
                />
                <View style={styles.termsText}>
                  <Text style={styles.termsLabel}>I agree to the </Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://lurk.app/privacy')}>
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <HelperText type="error" visible={!!registerErrors.agreeToPrivacy}>
                {registerErrors.agreeToPrivacy}
              </HelperText>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={registerForm.allowMarketing ? 'checked' : 'unchecked'}
                  onPress={() => setRegisterForm({
                    ...registerForm,
                    allowMarketing: !registerForm.allowMarketing,
                  })}
                />
                <Text style={styles.termsLabel}>
                  Send me promotional offers and updates (optional)
                </Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={authLoading}
              disabled={authLoading}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
            >
              Create Account
            </Button>
          </View>
        )}

        <View style={styles.socialSection}>
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: '#DB4437' }]}
              onPress={() => handleSocialLogin('google')}
            >
              <Icon name="google" size={24} color="#FFFFFF" />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: '#0078D4' }]}
              onPress={() => handleSocialLogin('microsoft')}
            >
              <Icon name="microsoft" size={24} color="#FFFFFF" />
              <Text style={styles.socialButtonText}>Microsoft</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.switchAuth}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchLink}>
              {isLogin ? 'Sign Up' : 'Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  // Render forgot password modal
  const renderForgotPasswordModal = () => {
    return (
      <Portal>
        <Modal
          visible={showForgotPassword}
          onDismiss={() => {
            setShowForgotPassword(false);
            setForgotPasswordEmail('');
          }}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Reset Password</Title>
          <Paragraph style={styles.modalSubtitle}>
            Enter your email address and we'll send you instructions to reset your password.
          </Paragraph>

          <View style={styles.inputGroup}>
            <TextInput
              mode="outlined"
              label="Email Address"
              value={forgotPasswordEmail}
              onChangeText={setForgotPasswordEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email" />}
              style={styles.textInput}
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => {
                setShowForgotPassword(false);
                setForgotPasswordEmail('');
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleForgotPassword}
              style={styles.modalButton}
            >
              Send Reset Email
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Render biometric prompt
  const renderBiometricPrompt = () => {
    if (!showBiometricPrompt) return null;

    return (
      <View style={styles.biometricPrompt}>
        <Surface style={styles.biometricCard}>
          <Icon name="fingerprint" size={64} color="#4A90E2" />
          <Title style={styles.biometricTitle}>Biometric Login</Title>
          <Paragraph style={styles.biometricText}>
            Use your biometric authentication to quickly login to your account.
          </Paragraph>
          <View style={styles.biometricActions}>
            <Button
              mode="outlined"
              onPress={() => setShowBiometricPrompt(false)}
              style={styles.biometricButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleBiometricLogin}
              icon="fingerprint"
              style={styles.biometricButton}
            >
              Login
            </Button>
          </View>
        </Surface>
      </View>
    );
  };

  if (authLoading && !isAuthenticated) {
    return <LoadingSpinner />;
  }

  if (authError && !authLoading) {
    return <ErrorDisplay error={authError} onRetry={() => {}} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderLogoSection()}
        {renderLoginForm()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.footerLink}
              onPress={() => Linking.openURL('https://lurk.app/terms')}
            >
              Terms
            </Text>{' '}
            and{' '}
            <Text
              style={styles.footerLink}
              onPress={() => Linking.openURL('https://lurk.app/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </ScrollView>

      {renderForgotPasswordModal()}
      {renderBiometricPrompt()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A90E2',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtagline: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  formCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
  },
  formOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  forgotPasswordLink: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    marginBottom: 16,
  },
  biometricButton: {
    borderColor: '#4A90E2',
  },
  buttonContent: {
    paddingVertical: 12,
  },
  termsSection: {
    marginBottom: 20,
  },
  termsText: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 8,
    flex: 1,
  },
  termsLabel: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    color: '#4A90E2',
    textDecorationLine: 'underline',
  },
  socialSection: {
    marginVertical: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  switchAuth: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 16,
    color: '#666',
  },
  switchLink: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    fontSize: 12,
    color: '#4A90E2',
    textDecorationLine: 'underline',
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
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    backgroundColor: '#4A90E2',
  },
  biometricPrompt: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  biometricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    margin: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  biometricTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  biometricText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  biometricActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  biometricButton: {
    flex: 1,
  },
});

export default LoginScreen;