/**
 * Profile Screen - User Profile Management
 * Shows user profile with options to edit and manage account settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import {
  Surface,
  Card,
  Title,
  Paragraph,
  Button,
  List,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Modal,
  Portal,
  TextInput,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

// Import components
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';

// Import services
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';

// Import Redux actions and selectors
import {
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  updateUser,
  logoutUser,
} from '../store/slices/authSlice';
import {
  selectSubscriptionTier,
  selectFeatures,
} from '../store/slices/premiumSlice';

const { width, height } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  // Selectors
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const subscriptionTier = useSelector(selectSubscriptionTier);
  const features = useSelector(selectFeatures);

  // Local state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    profile_picture: '',
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Navigation header setup
  useEffect(() => {
    navigation.setOptions({
      title: 'Profile',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowEditModal(true)}
          style={styles.headerButton}
        >
          <Icon name="pencil" size={24} color="#4A90E2" />
        </TouchableOpacity>
      ),
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

  // Initialize edit form with user data
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        profile_picture: user.profile_picture || '',
      });
    }
  }, [user]);

  // Handle profile update
  const handleProfileUpdate = useCallback(async () => {
    try {
      const updatedData = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        profile_picture: editForm.profile_picture.trim(),
      };

      await dispatch(updateUser(updatedData)).unwrap();

      // Update local storage
      await StorageService.updateUserData(updatedData);

      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  }, [dispatch, editForm]);

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

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fetch latest user data
      // This would normally dispatch an action to fetch user data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Get KYC status
  const getKYCStatus = useCallback(() => {
    const kycStatus = user?.kyc_status || 'not_started';
    const kycLevel = user?.kyc_level || 'basic';

    let statusText = 'Not Started';
    let statusColor = '#9E9E9E';
    let statusIcon = 'account-outline';

    switch (kycStatus) {
      case 'pending':
        statusText = 'Pending';
        statusColor = '#FF9800';
        statusIcon = 'clock-outline';
        break;
      case 'verified':
        statusText = 'Verified';
        statusColor = '#4CAF50';
        statusIcon = 'check-circle-outline';
        break;
      case 'rejected':
        statusText = 'Action Needed';
        statusColor = '#F44336';
        statusIcon = 'alert-circle-outline';
        break;
    }

    return { statusText, statusColor, statusIcon, kycLevel };
  }, [user]);

  // Get account statistics
  const getAccountStats = useCallback(() => {
    const joinedDate = user?.created_at ? new Date(user.created_at) : new Date();
    const daysSinceJoined = Math.floor((new Date() - joinedDate) / (1000 * 60 * 60 * 24));

    return {
      joinedDate: joinedDate.toLocaleDateString(),
      daysSinceJoined,
      totalPayments: user?.total_payments || 0,
      totalSavings: user?.total_saved || 0,
      cardsAdded: user?.cards_added || 0,
    };
  }, [user]);

  const kycStatus = getKYCStatus();
  const accountStats = getAccountStats();

  // Render profile header
  const renderProfileHeader = () => {
    return (
      <Surface style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Avatar.Text
            size={80}
            label={user?.name?.charAt(0)?.toUpperCase() || 'U'}
            style={styles.avatar}
          />
          <View style={styles.profileDetails}>
            <Title style={styles.userName}>{user?.name || 'User'}</Title>
            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
            <Text style={styles.userPhone}>{user?.phone || '+91 98765 43210'}</Text>
            <View style={styles.kycStatus}>
              <Icon name={kycStatus.statusIcon} size={16} color={kycStatus.statusColor} />
              <Text style={[styles.kycStatusText, { color: kycStatus.statusColor }]}>
                KYC: {kycStatus.statusText}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.subscriptionBadge}>
          <Chip
            icon="crown"
            textStyle={[styles.subscriptionText, { color: subscriptionTier === 'free' ? '#666' : '#FFD700' }]}
            style={[
              styles.subscriptionChip,
              { backgroundColor: subscriptionTier === 'free' ? '#F5F5F5' : '#FFF9C4' }
            ]}
          >
            {subscriptionTier === 'free' ? 'Free' : subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)} Plan
          </Chip>
        </View>
      </Surface>
    );
  };

  // Render account statistics
  const renderAccountStats = () => {
    return (
      <Surface style={styles.statsCard}>
        <Title style={styles.statsTitle}>Account Statistics</Title>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{accountStats.daysSinceJoined}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{accountStats.totalSavings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{accountStats.cardsAdded}</Text>
            <Text style={styles.statLabel}>Cards Added</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{accountStats.totalPayments}</Text>
            <Text style={styles.statLabel}>Payments Processed</Text>
          </View>
        </View>

        <Text style={styles.joinedDate}>
          Member since {accountStats.joinedDate}
        </Text>
      </Surface>
    );
  };

  // Render features list
  const renderFeaturesList = () => {
    const featureItems = [
      {
        icon: 'shield-check-outline',
        title: 'Account Security',
        description: 'Manage your account security settings',
        color: '#4CAF50',
        onPress: () => navigation.navigate('Settings', { screen: 'Security' }),
      },
      {
        icon: 'bell-outline',
        title: 'Notifications',
        description: 'Configure your notification preferences',
        color: '#2196F3',
        onPress: () => navigation.navigate('Settings', { screen: 'Notifications' }),
      },
      {
        icon: 'credit-card-outline',
        title: 'Payment Methods',
        description: 'Manage your payment methods',
        color: '#9C27B0',
        onPress: () => navigation.navigate('Settings', { screen: 'PaymentMethods' }),
      },
      {
        icon: 'file-document-outline',
        title: 'Terms & Privacy',
        description: 'Review our terms and privacy policy',
        color: '#607D8B',
        onPress: () => Linking.openURL('https://lurk.app/terms'),
      },
      {
        icon: 'help-circle-outline',
        title: 'Help & Support',
        description: 'Get help and contact support',
        color: '#FF9800',
        onPress: () => Linking.openURL('https://lurk.app/support'),
      },
    ];

    return (
      <Surface style={styles.featuresCard}>
        <Title style={styles.featuresTitle}>Account Settings</Title>

        {featureItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.featureItem}
            onPress={item.onPress}
          >
            <Icon name={item.icon} size={24} color={item.color} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDescription}>{item.description}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        ))}

        <Divider style={styles.divider} />

        <TouchableOpacity
          style={styles.featureItem}
          onPress={() => setShowLogoutModal(true)}
        >
          <Icon name="logout" size={24} color="#F44336" />
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: '#F44336' }]}>
              Logout
            </Text>
            <Text style={styles.featureDescription}>
              Sign out of your account
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color="#CCCCCC" />
        </TouchableOpacity>
      </Surface>
    );
  };

  // Render edit profile modal
  const renderEditModal = () => {
    return (
      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Edit Profile</Title>

          <View style={styles.formGroup}>
            <TextInput
              mode="outlined"
              label="Full Name"
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
              style={styles.textInput}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInput
              mode="outlined"
              label="Email"
              value={editForm.email}
              onChangeText={(text) => setEditForm({ ...editForm, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInput
              mode="outlined"
              label="Phone Number"
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              keyboardType="phone-pad"
              style={styles.textInput}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInput
              mode="outlined"
              label="Profile Picture URL"
              value={editForm.profile_picture}
              onChangeText={(text) => setEditForm({ ...editForm, profile_picture: text })}
              style={styles.textInput}
              placeholder="https://example.com/image.jpg"
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleProfileUpdate}
              loading={authLoading}
              disabled={authLoading}
              style={styles.saveButton}
            >
              Save Changes
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Render logout confirmation modal
  const renderLogoutModal = () => {
    return (
      <Portal>
        <Modal
          visible={showLogoutModal}
          onDismiss={() => setShowLogoutModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Confirm Logout</Title>

          <View style={styles.logoutContent}>
            <Icon name="logout" size={64} color="#F44336" />
            <Text style={styles.logoutMessage}>
              Are you sure you want to logout? You'll need to login again to access your account.
            </Text>
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowLogoutModal(false)}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleLogout}
              style={styles.logoutButton}
              textColor="#FFFFFF"
            >
              Logout
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  if (!isAuthenticated) {
    return <ErrorDisplay error="Not authenticated" onRetry={() => {}} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <ScrollView
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {renderProfileHeader()}
      {renderAccountStats()}
      {renderFeaturesList()}

      {renderEditModal()}
      {renderLogoutModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: '#4A90E2',
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
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
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  kycStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  subscriptionBadge: {
    alignItems: 'center',
  },
  subscriptionChip: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  subscriptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  joinedDate: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  featureContent: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    marginVertical: 16,
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
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  logoutContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },
  logoutButton: {
    backgroundColor: '#F44336',
  },
  headerButton: {
    padding: 8,
  },
});

export default ProfileScreen;