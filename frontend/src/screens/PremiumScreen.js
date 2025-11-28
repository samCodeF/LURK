/**
 * Premium Screen - Subscription Management
 * Handles premium plans, features, and subscription upgrades
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  Chip,
  Divider,
  List,
  RadioButton,
  Portal,
  Modal,
  ProgressBar,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useSelector, useDispatch } from 'react-redux';

// Import components
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';

// Import Redux actions and selectors
import {
  fetchSubscription,
  upgradeSubscription,
  downgradeSubscription,
  cancelSubscription,
  fetchPaymentMethods,
  fetchPromotions,
  applyPromoCode,
} from '../store/slices/premiumSlice';
import {
  selectSubscription,
  selectSubscriptionTier,
  selectFeatures,
  selectPricing,
  selectPromotions,
  selectPaymentMethods,
  selectSubscriptionLoading,
  selectBillingLoading,
} from '../store/selectors';

const { width, height } = Dimensions.get('window');

const PremiumScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  // Selectors
  const subscription = useSelector(selectSubscription);
  const subscriptionTier = useSelector(selectSubscriptionTier);
  const features = useSelector(selectFeatures);
  const pricing = useSelector(selectPricing);
  const promotions = useSelector(selectPromotions);
  const paymentMethods = useSelector(selectPaymentMethods);
  const subscriptionLoading = useSelector(selectSubscriptionLoading);
  const billingLoading = useSelector(selectBillingLoading);

  // Local state
  const [selectedPlan, setSelectedPlan] = useState('silver');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Navigation header setup
  useEffect(() => {
    navigation.setOptions({
      title: 'Premium',
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

  // Load subscription data on mount
  useEffect(() => {
    loadSubscriptionData();
  }, []);

  // Load subscription data
  const loadSubscriptionData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchSubscription()),
        dispatch(fetchPaymentMethods()),
        dispatch(fetchPromotions()),
      ]);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    }
  }, [dispatch]);

  // Handle plan selection
  const handlePlanSelect = useCallback((plan) => {
    setSelectedPlan(plan);
  }, []);

  // Handle billing cycle selection
  const handleBillingCycleSelect = useCallback((cycle) => {
    setBillingCycle(cycle);
  }, []);

  // Handle upgrade subscription
  const handleUpgrade = useCallback(async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method to continue.');
      return;
    }

    try {
      const result = await dispatch(upgradeSubscription({
        tier: selectedPlan,
        billingCycle,
        paymentMethodId: selectedPaymentMethod,
      })).unwrap();

      if (result.success) {
        Alert.alert(
          'Upgrade Successful!',
          `Welcome to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Upgrade Failed', error.message || 'Failed to upgrade subscription. Please try again.');
    }
  }, [dispatch, selectedPlan, billingCycle, selectedPaymentMethod, navigation]);

  // Handle downgrade subscription
  const handleDowngrade = useCallback(async () => {
    Alert.alert(
      'Downgrade Subscription',
      `Are you sure you want to downgrade to the selected plan? Changes will take effect at the end of your current billing period.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Downgrade',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(downgradeSubscription({ tier: selectedPlan })).unwrap();
              Alert.alert(
                'Downgrade Scheduled',
                'Your subscription will be downgraded at the end of the current billing period.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Downgrade Failed', error.message || 'Failed to downgrade subscription.');
            }
          },
        },
      ],
    );
  }, [dispatch, selectedPlan]);

  // Handle cancel subscription
  const handleCancel = useCallback(async () => {
    try {
      const result = await dispatch(cancelSubscription({
        cancelAtPeriodEnd: true,
        reason: 'User requested cancellation',
        feedback: '',
      })).unwrap();

      if (result.success) {
        Alert.alert(
          'Subscription Cancelled',
          'Your subscription has been cancelled. You will continue to have access until the end of your current billing period.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Cancellation Failed', error.message || 'Failed to cancel subscription.');
    }
  }, [dispatch, navigation]);

  // Handle promo code apply
  const handleApplyPromo = useCallback(async () => {
    if (!promoCode.trim()) {
      Alert.alert('Invalid Code', 'Please enter a valid promo code.');
      return;
    }

    try {
      const result = await dispatch(applyPromoCode({ code: promoCode })).unwrap();

      if (result.success) {
        Alert.alert(
          'Promo Code Applied!',
          result.message || 'Promo code has been applied successfully.',
          [{ text: 'OK', onPress: () => setShowPromoModal(false) }]
        );
        setPromoCode('');
      }
    } catch (error) {
      Alert.alert('Invalid Code', error.message || 'This promo code is invalid or has expired.');
    }
  }, [dispatch, promoCode]);

  // Calculate pricing
  const calculatePrice = useCallback((plan, cycle) => {
    const basePrice = pricing[plan]?.[cycle] || 0;
    return basePrice;
  }, [pricing]);

  // Calculate savings
  const calculateSavings = useCallback((plan, cycle) => {
    const monthlyPrice = calculatePrice(plan, 'monthly');
    const yearlyPrice = calculatePrice(plan, 'yearly');
    const yearlyMonthlyEquivalent = yearlyPrice / 12;
    const savings = yearlyMonthlyEquivalent * 12 - yearlyPrice;
    return savings > 0 ? Math.round(savings) : 0;
  }, [calculatePrice]);

  // Get plan features
  const getPlanFeatures = useCallback((plan) => {
    switch (plan) {
      case 'silver':
        return [
          'Up to 5 credit cards',
          '50 automated payments/month',
          'Advanced analytics',
          'Payment scheduling',
          'Priority email support',
        ];
      case 'gold':
        return [
          'Up to 20 credit cards',
          '200 automated payments/month',
          'AI-powered insights',
          'Custom payment rules',
          'API access',
          'Early payment reminders',
        ];
      case 'platinum':
        return [
          'Unlimited credit cards',
          'Unlimited automated payments',
          'Dedicated support manager',
          'Custom integrations',
          'Advanced reporting',
          'White labeling options',
        ];
      default:
        return [
          'Up to 1 credit card',
          'Basic automation',
          'Basic analytics',
          'Email support',
        ];
    }
  }, []);

  // Render plan card
  const renderPlanCard = (plan) => {
    const monthlyPrice = calculatePrice(plan, 'monthly');
    const yearlyPrice = calculatePrice(plan, 'yearly');
    const savings = calculateSavings(plan, 'yearly');
    const isSelected = selectedPlan === plan;
    const isCurrent = subscriptionTier === plan;

    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard,
          isCurrent && styles.currentPlanCard,
        ]}
        onPress={() => handlePlanSelect(plan)}
      >
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planTitle}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </Text>
            {isCurrent && (
              <Chip style={styles.currentPlanChip} textStyle={styles.currentPlanText}>
                Current Plan
              </Chip>
            )}
          </View>
          <View style={styles.planPricing}>
            <Text style={styles.planPrice}>₹{monthlyPrice}/mo</Text>
            <Text style={styles.planYearly}>₹{yearlyPrice}/yr</Text>
            {savings > 0 && (
              <Text style={styles.planSavings}>Save ₹{savings}/yr</Text>
            )}
          </View>
        </View>

        <View style={styles.planFeatures}>
          {getPlanFeatures(plan).map((feature, index) => (
            <View key={index} style={styles.planFeature}>
              <Icon
                name="check-circle"
                size={20}
                color={isSelected ? '#4A90E2' : '#4CAF50'}
              />
              <Text style={styles.planFeatureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.planAction}>
          {isCurrent ? (
            <Text style={styles.currentPlanText}>Your Current Plan</Text>
          ) : (
            <Button
              mode={isSelected ? 'contained' : 'outlined'}
              onPress={() => setShowPaymentModal(true)}
              style={[
                styles.planButton,
                isSelected && styles.selectedPlanButton,
              ]}
            >
              {isSelected ? 'Continue' : 'Select'}
            </Button>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render billing cycle selector
  const renderBillingCycle = () => {
    return (
      <View style={styles.billingSection}>
        <Text style={styles.sectionTitle}>Billing Cycle</Text>
        <RadioButton.Group
          onValueChange={handleBillingCycleSelect}
          value={billingCycle}
        >
          <View style={styles.billingOptions}>
            <RadioButton.Item label="Monthly" value="monthly" />
            <Text style={styles.billingOptionText}>Monthly</Text>
          </View>
          <View style={styles.billingOptions}>
            <RadioButton.Item label="Yearly" value="yearly" />
            <Text style={styles.billingOptionText}>Yearly (Save 20%)</Text>
          </View>
        </RadioButton.Group>
      </View>
    );
  };

  // Render payment methods
  const renderPaymentMethods = () => {
    return (
      <Surface style={styles.paymentMethodsSection}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.paymentMethodsGrid}>
          {paymentMethods.map((method, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === method.id && styles.selectedPaymentMethod,
              ]}
              onPress={() => setSelectedPaymentMethod(method.id)}
            >
              <View style={styles.paymentMethodInfo}>
                <Icon name={method.icon} size={24} color={selectedPaymentMethod === method.id ? '#4A90E2' : '#666'} />
                <Text style={styles.paymentMethodText}>{method.brand}</Text>
                <Text style={styles.paymentMethodLast4}>•••• {method.last4}</Text>
              </View>
              {method.is_default && (
                <Chip style={styles.defaultPaymentChip} textStyle={styles.defaultPaymentText}>
                  Default
                </Chip>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Button
          mode="outlined"
          onPress={() => navigation.navigate('PaymentMethods')}
          style={styles.addPaymentButton}
        >
          Add Payment Method
        </Button>
      </Surface>
    );
  };

  // Render promotions
  const renderPromotions = () => {
    if (promotions.length === 0) return null;

    return (
      <Surface style={styles.promotionsSection}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.promotionsList}>
            {promotions.map((promo, index) => (
              <Card key={index} style={styles.promotionCard}>
                <View style={styles.promotionHeader}>
                  <Text style={styles.promotionTitle}>{promo.title}</Text>
                  <Chip style={styles.promotionChip} textStyle={styles.promotionChipText}>
                    {promo.discount}% OFF
                  </Chip>
                </View>
                <Text style={styles.promotionDescription}>{promo.description}</Text>
                <Button
                  mode="contained"
                  onPress={() => {
                    setPromoCode(promo.code);
                    setShowPromoModal(false);
                  }}
                  style={styles.promotionButton}
                >
                  Apply Code
                </Button>
              </Card>
            ))}
          </View>
        </ScrollView>
      </Surface>
    );
  };

  // Render payment modal
  const renderPaymentModal = () => {
    return (
      <Portal>
        <Modal
          visible={showPaymentModal}
          onDismiss={() => setShowPaymentModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Complete Your Upgrade</Title>

          <View style={styles.upgradeSummary}>
            <Text style={styles.upgradePlan}>
              Plan: {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
            </Text>
            <Text style={styles.upgradeCycle}>
              Billing: {billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}
            </Text>
            <Text style={styles.upgradePrice}>
              Price: ₹{calculatePrice(selectedPlan, billingCycle)}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
            </Text>
          </View>

          <View style={styles.paymentSelection}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            <ScrollView style={styles.paymentList}>
              {paymentMethods.map((method, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.paymentOption,
                    selectedPaymentMethod === method.id && styles.selectedPaymentOption,
                  ]}
                  onPress={() => setSelectedPaymentMethod(method.id)}
                >
                  <Icon name={method.icon} size={24} color={selectedPaymentMethod === method.id ? '#4A90E2' : '#666'} />
                  <Text style={styles.paymentOptionText}>{method.brand}</Text>
                  <Text style={styles.paymentOptionLast4}>•••• {method.last4}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowPaymentModal(false)}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleUpgrade}
              loading={billingLoading}
              disabled={!selectedPaymentMethod || billingLoading}
              style={styles.confirmButton}
            >
              Upgrade Now
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Render promo modal
  const renderPromoModal = () => {
    return (
      <Portal>
        <Modal
          visible={showPromoModal}
          onDismiss={() => setShowPromoModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Apply Promo Code</Title>

          <View style={styles.promoForm}>
            <Text style={styles.promoLabel}>Enter your promo code:</Text>
            <TextInput
              mode="outlined"
              value={promoCode}
              onChangeText={setPromoCode}
              style={styles.promoInput}
              placeholder="Enter promo code"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowPromoModal(false)}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleApplyPromo}
              style={styles.applyButton}
            >
              Apply
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  if (subscriptionLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Current Plan Status */}
      <Surface style={styles.currentPlanSection}>
        <View style={styles.currentPlanInfo}>
          <Icon name="crown" size={32} color="#FFD700" />
          <View style={styles.currentPlanDetails}>
            <Text style={styles.currentPlanTitle}>Current Plan</Text>
            <Text style={styles.currentPlanTier}>
              {subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}
            </Text>
            <Text style={styles.currentPlanStatus}>
              {subscription.status === 'active' ? 'Active' : subscription.status}
            </Text>
          </View>
        </View>

        {subscription.status === 'active' && (
          <Button
            mode="outlined"
            onPress={() => setShowCancelModal(true)}
            style={styles.cancelButton}
            textColor="#F44336"
          >
            Cancel Subscription
          </Button>
        )}
      </Surface>

      {/* Billing Cycle Selector */}
      {renderBillingCycle()}

      {/* Available Plans */}
      <View style={styles.plansSection}>
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>
        <View style={styles.plansContainer}>
          {['silver', 'gold', 'platinum'].map(renderPlanCard)}
        </View>
      </View>

      {/* Payment Methods */}
      {renderPaymentMethods()}

      {/* Promotions */}
      {renderPromotions()}

      {/* Modals */}
      {renderPaymentModal()}
      {renderPromoModal()}

      {/* Cancel Confirmation Modal would go here */}
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
  currentPlanSection: {
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
  currentPlanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPlanDetails: {
    marginLeft: 16,
    flex: 1,
  },
  currentPlanTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentPlanTier: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  currentPlanStatus: {
    fontSize: 16,
    color: '#4CAF50',
  },
  cancelButton: {
    borderColor: '#F44336',
    marginTop: 8,
  },
  billingSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  billingOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  billingOptionText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 8,
  },
  plansSection: {
    marginBottom: 16,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedPlanCard: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  currentPlanCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  currentPlanChip: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-start',
  },
  currentPlanText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 2,
  },
  planYearly: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  planSavings: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  planFeatures: {
    marginBottom: 16,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 8,
    flex: 1,
  },
  planAction: {
    alignItems: 'center',
  },
  planButton: {
    borderRadius: 8,
  },
  selectedPlanButton: {
    backgroundColor: '#4A90E2',
  },
  paymentMethodsSection: {
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
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  paymentMethod: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  selectedPaymentMethod: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  paymentMethodInfo: {
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    marginTop: 4,
  },
  paymentMethodLast4: {
    fontSize: 12,
    color: '#666',
  },
  defaultPaymentChip: {
    backgroundColor: '#4CAF50',
    position: 'absolute',
    top: 4,
    right: 4,
  },
  defaultPaymentText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  addPaymentButton: {
    alignSelf: 'center',
  },
  promotionsSection: {
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
  promotionsList: {
    flexDirection: 'row',
    gap: 12,
  },
  promotionCard: {
    width: 200,
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promotionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  promotionChip: {
    backgroundColor: '#FF6B6B',
  },
  promotionChipText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  promotionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  promotionButton: {
    borderRadius: 4,
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
  upgradeSummary: {
    marginBottom: 24,
  },
  upgradePlan: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  upgradeCycle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  upgradePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  paymentSelection: {
    marginBottom: 24,
  },
  paymentList: {
    maxHeight: 200,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  selectedPaymentOption: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 12,
    flex: 1,
  },
  paymentOptionLast4: {
    fontSize: 12,
    color: '#666',
  },
  promoForm: {
    marginBottom: 24,
  },
  promoLabel: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 8,
  },
  promoInput: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
  },
  applyButton: {
    backgroundColor: '#4A90E2',
  },
});

export default PremiumScreen;