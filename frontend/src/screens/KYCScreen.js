/**
 * KYC Screen - Know Your Customer Verification
 * Handles Aadhaar OTP verification and identity verification
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
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
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

// Import services
import { ApiService } from '../services/ApiService';
import { StorageService } from '../services/StorageService';

// Import Redux actions
import {
  selectAuthLoading,
  selectAuthError,
  updateUserKyc
} from '../store/slices/authSlice';

const { width, height } = Dimensions.get('window');

const KYCScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  // Selectors
  const authLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  // Local state
  const [currentStep, setCurrentStep] = useState(1); // 1: Phone, 2: OTP, 3: Personal Details, 4: Verification
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);

  // Personal details
  const [personalDetails, setPersonalDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    address: '',
    pincode: '',
    occupation: '',
    annualIncome: '',
  });

  // Agreement states
  const [agreements, setAgreements] = useState({
    termsAccepted: false,
    privacyAccepted: false,
    aadhaarConsent: false,
    marketingConsent: false,
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // KYC data from backend
  const [kycConfig, setKycConfig] = useState({
    aadhaarMasked: '',
    verificationMethods: [],
    supportedDocuments: [],
  });

  // Timer for resend OTP
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      setResendDisabled(false);
    }

    return () => clearInterval(interval);
  }, [resendTimer]);

  // Get KYC configuration on mount
  useEffect(() => {
    getKycConfiguration();
  }, []);

  // Navigation header setup
  useEffect(() => {
    navigation.setOptions({
      title: 'KYC Verification',
      headerShown: true,
      headerStyle: {
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Icon name="arrow-left" size={24} color="#4A90E2" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Get KYC configuration from backend
  const getKycConfiguration = useCallback(async () => {
    try {
      const response = await ApiService.get('/auth/kyc/config');
      setKycConfig(response.data || {});
    } catch (error) {
      console.error('Error fetching KYC config:', error);
      // Continue with default config
    }
  }, []);

  // Validate phone number
  const validatePhone = useCallback(() => {
    const newErrors = {};

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [phone]);

  // Send OTP
  const sendOtp = useCallback(async () => {
    if (!validatePhone()) return;

    try {
      const response = await ApiService.post('/auth/kyc/send-otp', {
        phone: phone.replace(/\D/g, ''),
        type: 'aadhaar_verification',
      });

      if (response.data.success) {
        setOtpSent(true);
        setCurrentStep(2);
        setResendTimer(60); // 60 seconds resend timer
        setResendDisabled(true);
        Alert.alert(
          'OTP Sent',
          'A 6-digit OTP has been sent to your registered mobile number.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to send OTP. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [phone, validatePhone]);

  // Validate OTP
  const validateOtp = useCallback(() => {
    const otpValue = otp.join('');
    const newErrors = {};

    if (!otpValue) {
      newErrors.otp = 'Please enter OTP';
    } else if (otpValue.length !== 6) {
      newErrors.otp = 'Please enter 6-digit OTP';
    } else if (!/^\d{6}$/.test(otpValue)) {
      newErrors.otp = 'Please enter valid OTP';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [otp]);

  // Verify OTP
  const verifyOtp = useCallback(async () => {
    if (!validateOtp()) return;

    try {
      const response = await ApiService.post('/auth/kyc/verify-otp', {
        phone: phone.replace(/\D/g, ''),
        otp: otp.join(''),
      });

      if (response.data.success) {
        setCurrentStep(3);
        // Pre-fill personal details if available
        if (response.data.personal_details) {
          setPersonalDetails({
            firstName: response.data.personal_details.first_name || '',
            lastName: response.data.personal_details.last_name || '',
            email: response.data.personal_details.email || '',
            dateOfBirth: response.data.personal_details.date_of_birth || '',
            address: response.data.personal_details.address || '',
            pincode: response.data.personal_details.pincode || '',
            occupation: response.data.personal_details.occupation || '',
            annualIncome: response.data.personal_details.annual_income || '',
          });
        }
      } else {
        throw new Error(response.data.message || 'OTP verification failed');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to verify OTP. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [phone, otp, validateOtp]);

  // Resend OTP
  const resendOtpCode = useCallback(async () => {
    setResendDisabled(true);
    try {
      const response = await ApiService.post('/auth/kyc/resend-otp', {
        phone: phone.replace(/\D/g, ''),
        type: 'aadhaar_verification',
      });

      if (response.data.success) {
        setResendTimer(60);
        Alert.alert(
          'OTP Resent',
          'A new OTP has been sent to your mobile number.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to resend OTP. Please try again.',
        [{ text: 'OK' }]
      );
      setResendDisabled(false);
    }
  }, [phone]);

  // Validate personal details
  const validatePersonalDetails = useCallback(() => {
    const newErrors = {};

    if (!personalDetails.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!personalDetails.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!personalDetails.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(personalDetails.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!personalDetails.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }

    if (!personalDetails.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!personalDetails.pincode.trim()) {
      newErrors.pincode = 'PIN code is required';
    } else if (!/^\d{6}$/.test(personalDetails.pincode)) {
      newErrors.pincode = 'Invalid PIN code';
    }

    if (!personalDetails.occupation.trim()) {
      newErrors.occupation = 'Occupation is required';
    }

    if (!personalDetails.annualIncome.trim()) {
      newErrors.annualIncome = 'Annual income is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [personalDetails]);

  // Submit KYC
  const submitKyc = useCallback(async () => {
    if (!validatePersonalDetails()) return;

    if (!agreements.termsAccepted || !agreements.privacyAccepted || !agreements.aadhaarConsent) {
      Alert.alert(
        'Agreements Required',
        'Please accept all required agreements to proceed.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const response = await ApiService.post('/auth/kyc/submit', {
        phone: phone.replace(/\D/g, ''),
        personal_details: personalDetails,
        agreements: {
          terms_accepted: agreements.termsAccepted,
          privacy_accepted: agreements.privacyAccepted,
          aadhaar_consent: agreements.aadhaarConsent,
          marketing_consent: agreements.marketingConsent,
        },
      });

      if (response.data.success) {
        // Update user KYC status in Redux
        dispatch(updateUserKyc({
          kyc_status: 'verified',
          kyc_level: 'basic',
          kyc_verified_at: new Date().toISOString(),
        }));

        // Store KYC data locally
        await StorageService.updateUserData({
          kyc_status: 'verified',
          kyc_level: 'basic',
          kyc_verified_at: new Date().toISOString(),
        });

        Alert.alert(
          'KYC Successful!',
          'Your identity has been verified successfully. You can now add your credit cards.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Profile')
            }
          ]
        );
      } else {
        throw new Error(response.data.message || 'KYC submission failed');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to submit KYC. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [phone, personalDetails, agreements, validatePersonalDetails, dispatch, navigation]);

  // Handle OTP input change
  const handleOtpChange = useCallback((value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;

    // Auto-focus next input
    if (value && index < 3) {
      // Focus next input (this would require refs in actual implementation)
    }

    setOtp(newOtp);
    setErrors(prev => ({ ...prev, otp: '' }));
  }, [otp]);

  // Render Step 1: Phone Number
  const renderPhoneStep = () => (
    <Card style={styles.card}>
      <Title style={styles.cardTitle}>Mobile Number Verification</Title>
      <Paragraph style={styles.cardSubtitle}>
        Enter your 10-digit mobile number registered with your Aadhaar
      </Paragraph>

      <View style={styles.formGroup}>
        <TextInput
          mode="outlined"
          label="Mobile Number"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            if (errors.phone) {
              setErrors(prev => ({ ...prev, phone: '' }));
            }
          }}
          error={!!errors.phone}
          keyboardType="phone-pad"
          maxLength={10}
          left={<TextInput.Icon icon="phone" />}
          style={styles.textInput}
        />
        <HelperText type="error" visible={!!errors.phone}>
          {errors.phone}
        </HelperText>
      </View>

      <Button
        mode="contained"
        onPress={sendOtp}
        loading={authLoading}
        disabled={authLoading}
        style={styles.button}
      >
        Send OTP
      </Button>

      <View style={styles.infoBox}>
        <Icon name="information" size={20} color="#4A90E2" />
        <Text style={styles.infoText}>
          We use your mobile number only for OTP verification. Your data is secure and encrypted.
        </Text>
      </View>
    </Card>
  );

  // Render Step 2: OTP Verification
  const renderOtpStep = () => (
    <Card style={styles.card}>
      <Title style={styles.cardTitle}>Enter OTP</Title>
      <Paragraph style={styles.cardSubtitle}>
        6-digit OTP has been sent to {phone.replace(/(\d{3})(\d{4})(\d{3})/, '$1-$2-$3')}
      </Paragraph>

      <View style={styles.otpContainer}>
        {otp.map((value, index) => (
          <TextInput
            key={index}
            mode="outlined"
            value={value}
            onChangeText={(text) => handleOtpChange(text, index)}
            keyboardType="numeric"
            maxLength={1}
            style={[
              styles.otpInput,
              errors.otp && styles.otpInputError
            ]}
            textAlign="center"
          />
        ))}
      </View>

      <HelperText type="error" visible={!!errors.otp}>
        {errors.otp}
      </HelperText>

      <View style={styles.buttonRow}>
        <Button
          mode="outlined"
          onPress={() => setCurrentStep(1)}
          style={styles.secondaryButton}
        >
          Change Number
        </Button>

        <Button
          mode="contained"
          onPress={verifyOtp}
          loading={authLoading}
          disabled={authLoading}
          style={styles.button}
        >
          Verify OTP
        </Button>
      </View>

      <TouchableOpacity
        onPress={resendOtpCode}
        disabled={resendDisabled}
        style={styles.resendContainer}
      >
        <Text style={[styles.resendText, resendDisabled && styles.resendTextDisabled]}>
          {resendTimer > 0
            ? `Resend OTP in ${resendTimer}s`
            : 'Resend OTP'
          }
        </Text>
      </TouchableOpacity>
    </Card>
  );

  // Render Step 3: Personal Details
  const renderPersonalDetailsStep = () => (
    <Card style={styles.card}>
      <Title style={styles.cardTitle}>Personal Information</Title>
      <Paragraph style={styles.cardSubtitle}>
        Please provide your personal details for verification
      </Paragraph>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formRow}>
          <View style={styles.formHalf}>
            <TextInput
              mode="outlined"
              label="First Name"
              value={personalDetails.firstName}
              onChangeText={(text) => {
                setPersonalDetails(prev => ({ ...prev, firstName: text }));
                if (errors.firstName) {
                  setErrors(prev => ({ ...prev, firstName: '' }));
                }
              }}
              error={!!errors.firstName}
              style={styles.textInput}
            />
            <HelperText type="error" visible={!!errors.firstName}>
              {errors.firstName}
            </HelperText>
          </View>

          <View style={styles.formHalf}>
            <TextInput
              mode="outlined"
              label="Last Name"
              value={personalDetails.lastName}
              onChangeText={(text) => {
                setPersonalDetails(prev => ({ ...prev, lastName: text }));
                if (errors.lastName) {
                  setErrors(prev => ({ ...prev, lastName: '' }));
                }
              }}
              error={!!errors.lastName}
              style={styles.textInput}
            />
            <HelperText type="error" visible={!!errors.lastName}>
              {errors.lastName}
            </HelperText>
          </View>
        </View>

        <View style={styles.formGroup}>
          <TextInput
            mode="outlined"
            label="Email Address"
            value={personalDetails.email}
            onChangeText={(text) => {
              setPersonalDetails(prev => ({ ...prev, email: text }));
              if (errors.email) {
                setErrors(prev => ({ ...prev, email: '' }));
              }
            }}
            error={!!errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.textInput}
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email}
          </HelperText>
        </View>

        <View style={styles.formGroup}>
          <TextInput
            mode="outlined"
            label="Date of Birth (DD/MM/YYYY)"
            value={personalDetails.dateOfBirth}
            onChangeText={(text) => {
              setPersonalDetails(prev => ({ ...prev, dateOfBirth: text }));
              if (errors.dateOfBirth) {
                setErrors(prev => ({ ...prev, dateOfBirth: '' }));
              }
            }}
            error={!!errors.dateOfBirth}
            keyboardType="numeric"
            maxLength={10}
            style={styles.textInput}
          />
          <HelperText type="error" visible={!!errors.dateOfBirth}>
            {errors.dateOfBirth}
          </HelperText>
        </View>

        <View style={styles.formGroup}>
          <TextInput
            mode="outlined"
            label="Address"
            value={personalDetails.address}
            onChangeText={(text) => {
              setPersonalDetails(prev => ({ ...prev, address: text }));
              if (errors.address) {
                setErrors(prev => ({ ...prev, address: '' }));
              }
            }}
            error={!!errors.address}
            multiline
            numberOfLines={2}
            style={styles.textInput}
          />
          <HelperText type="error" visible={!!errors.address}>
            {errors.address}
          </HelperText>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formHalf}>
            <TextInput
              mode="outlined"
              label="PIN Code"
              value={personalDetails.pincode}
              onChangeText={(text) => {
                setPersonalDetails(prev => ({ ...prev, pincode: text }));
                if (errors.pincode) {
                  setErrors(prev => ({ ...prev, pincode: '' }));
                }
              }}
              error={!!errors.pincode}
              keyboardType="numeric"
              maxLength={6}
              style={styles.textInput}
            />
            <HelperText type="error" visible={!!errors.pincode}>
              {errors.pincode}
            </HelperText>
          </View>

          <View style={styles.formHalf}>
            <TextInput
              mode="outlined"
              label="Occupation"
              value={personalDetails.occupation}
              onChangeText={(text) => {
                setPersonalDetails(prev => ({ ...prev, occupation: text }));
                if (errors.occupation) {
                  setErrors(prev => ({ ...prev, occupation: '' }));
                }
              }}
              error={!!errors.occupation}
              style={styles.textInput}
            />
            <HelperText type="error" visible={!!errors.occupation}>
              {errors.occupation}
            </HelperText>
          </View>
        </View>

        <View style={styles.formGroup}>
          <TextInput
            mode="outlined"
            label="Annual Income (₹)"
            value={personalDetails.annualIncome}
            onChangeText={(text) => {
              setPersonalDetails(prev => ({ ...prev, annualIncome: text }));
              if (errors.annualIncome) {
                setErrors(prev => ({ ...prev, annualIncome: '' }));
              }
            }}
            error={!!errors.annualIncome}
            keyboardType="numeric"
            style={styles.textInput}
          />
          <HelperText type="error" visible={!!errors.annualIncome}>
            {errors.annualIncome}
          </HelperText>
        </View>
      </ScrollView>

      <View style={styles.agreementContainer}>
        <View style={styles.checkboxRow}>
          <Checkbox
            status={agreements.aadhaarConsent ? 'checked' : 'unchecked'}
            onPress={() => setAgreements(prev => ({ ...prev, aadhaarConsent: !prev.aadhaarConsent }))}
          />
          <View style={styles.checkboxText}>
            <Text style={styles.agreementLabel}>I consent to verify my identity through Aadhaar OTP</Text>
          </View>
        </View>

        <View style={styles.checkboxRow}>
          <Checkbox
            status={agreements.termsAccepted ? 'checked' : 'unchecked'}
            onPress={() => setAgreements(prev => ({ ...prev, termsAccepted: !prev.termsAccepted }))}
          />
          <View style={styles.checkboxText}>
            <Text style={styles.agreementLabel}>
              I agree to the{' '}
              <Text
                style={styles.linkText}
                onPress={() => Linking.openURL('https://lurk.app/terms')}
              >
                Terms of Service
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.checkboxRow}>
          <Checkbox
            status={agreements.privacyAccepted ? 'checked' : 'unchecked'}
            onPress={() => setAgreements(prev => ({ ...prev, privacyAccepted: !prev.privacyAccepted }))}
          />
          <View style={styles.checkboxText}>
            <Text style={styles.agreementLabel}>
              I agree to the{' '}
              <Text
                style={styles.linkText}
                onPress={() => Linking.openURL('https://lurk.app/privacy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.checkboxRow}>
          <Checkbox
            status={agreements.marketingConsent ? 'checked' : 'unchecked'}
            onPress={() => setAgreements(prev => ({ ...prev, marketingConsent: !prev.marketingConsent }))}
          />
          <View style={styles.checkboxText}>
            <Text style={styles.agreementLabel}>
              I would like to receive promotional offers and updates (optional)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Button
          mode="outlined"
          onPress={() => setCurrentStep(2)}
          style={styles.secondaryButton}
        >
          Back
        </Button>

        <Button
          mode="contained"
          onPress={submitKyc}
          loading={authLoading}
          disabled={authLoading}
          style={styles.button}
        >
          Submit KYC
        </Button>
      </View>
    </Card>
  );

  // Render Step 4: Verification Success
  const renderSuccessStep = () => (
    <Card style={styles.card}>
      <View style={styles.successContainer}>
        <Surface style={styles.successIcon}>
          <Icon name="check-circle" size={64} color="#4CAF50" />
        </Surface>

        <Title style={styles.successTitle}>KYC Verification Complete!</Title>

        <Text style={styles.successMessage}>
          Your identity has been successfully verified. You can now add your credit cards and start enjoying interest-free credit extensions.
        </Text>

        <View style={styles.successFeatures}>
          <View style={styles.successFeature}>
            <Icon name="shield-check" size={24} color="#4CAF50" />
            <Text style={styles.successFeatureText}>Bank-level Security</Text>
          </View>
          <View style={styles.successFeature}>
            <Icon name="credit-card-multiple" size={24} color="#4A90E2" />
            <Text style={styles.successFeatureText}>Add Multiple Cards</Text>
          </View>
          <View style={styles.successFeature}>
            <Icon name="autorenew" size={24} color="#FF9800" />
            <Text style={styles.successFeatureText}>Automated Payments</Text>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Profile')}
          style={styles.button}
        >
          Go to Profile
        </Button>
      </View>
    </Card>
  );

  // Render progress indicator
  const renderProgressIndicator = () => {
    const steps = [
      { number: 1, label: 'Phone' },
      { number: 2, label: 'OTP' },
      { number: 3, label: 'Details' },
      { number: 4, label: 'Complete' },
    ];

    return (
      <View style={styles.progressIndicator}>
        {steps.map((step, index) => (
          <View key={step.number} style={styles.progressStep}>
            <View style={[
              styles.stepCircle,
              currentStep >= step.number && [
                styles.stepCircleActive,
                currentStep === step.number && styles.stepCircleCurrent
              ]
            ]}>
              <Text style={[
                styles.stepNumber,
                currentStep >= step.number && styles.stepNumberActive
              ]}>
                {step.number}
              </Text>
            </View>
            <Text style={[
              styles.stepLabel,
              currentStep >= step.number && styles.stepLabelActive
            ]}>
              {step.label}
            </Text>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                currentStep > step.number && styles.stepLineActive
              ]} />
            )}
          </View>
        ))}
      </View>
    );
  };

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
        {renderProgressIndicator()}

        {currentStep === 1 && renderPhoneStep()}
        {currentStep === 2 && renderOtpStep()}
        {currentStep === 3 && renderPersonalDetailsStep()}
        {currentStep === 4 && renderSuccessStep()}
      </ScrollView>
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
    padding: 20,
    paddingBottom: 20,
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressStep: {
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#4A90E2',
  },
  stepCircleCurrent: {
    borderWidth: 3,
    borderColor: '#4A90E2',
    backgroundColor: '#FFFFFF',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999999',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: -20,
    height: 2,
    backgroundColor: '#E0E0E0',
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: '#4A90E2',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  formHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  textInput: {
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  secondaryButton: {
    borderColor: '#CCCCCC',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 50,
    height: 50,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  otpInputError: {
    borderColor: '#F44336',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: '#CCCCCC',
  },
  agreementContainer: {
    marginVertical: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkboxText: {
    flex: 1,
    marginLeft: 8,
  },
  agreementLabel: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  linkText: {
    color: '#4A90E2',
    textDecorationLine: 'underline',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  successFeature: {
    alignItems: 'center',
  },
  successFeatureText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
  },
});

export default KYCScreen;