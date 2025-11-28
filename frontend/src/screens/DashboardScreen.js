/**
 * Dashboard Screen - Main Lurk App Dashboard
 * Shows overview of cards, payments, savings, and quick actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  ProgressBar,
  Divider,
  FAB,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useSelector, useDispatch } from 'react-redux';

// Import components
import CardComponent from '../components/CardComponent';
import PaymentAlertItem from '../components/PaymentAlertItem';
import SavingsChart from '../components/SavingsChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';

// Import Redux actions and selectors
import {
  fetchCards,
  syncCard,
  createPayment,
} from '../store/slices/cardsSlice';
import {
  fetchUpcomingPayments,
  fetchPaymentSummary,
} from '../store/slices/paymentsSlice';
import {
  selectCards,
  selectCardsLoading,
  selectCardsError,
  selectUpcomingPayments,
  selectPaymentSummary,
} from '../store/selectors';

// Import services
import { ApiService } from '../services/ApiService';
import { StorageService } from '../services/StorageService';

const { width, height } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  // Selectors
  const cards = useSelector(selectCards);
  const cardsLoading = useSelector(selectCardsLoading);
  const cardsError = useSelector(selectCardsError);
  const upcomingPayments = useSelector(selectUpcomingPayments);
  const paymentSummary = useSelector(selectPaymentSummary);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Data on component mount and refresh
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Navigation header setup
  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Lurk',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.headerButton}>
          <Icon name="cog" size={24} color="#4A90E2" />
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

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchCards()),
        dispatch(fetchUpcomingPayments()),
        dispatch(fetchPaymentSummary()),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [dispatch]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboardData]);

  // Handle card sync
  const handleSyncCard = useCallback(async (cardId) => {
    try {
      await dispatch(syncCard(cardId));
      Alert.alert('Success', 'Card synced successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync card. Please try again.');
    }
  }, [dispatch]);

  // Handle immediate payment
  const handleImmediatePayment = useCallback(async (cardId) => {
    try {
      Alert.alert(
        'Confirm Payment',
        'Are you sure you want to make an immediate payment for the minimum due amount?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay Now',
            style: 'default',
            onPress: async () => {
              await dispatch(createPayment({ card_id: cardId }));
              Alert.alert('Success', 'Payment initiated successfully!');
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate payment. Please try again.');
    }
  }, [dispatch]);

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    const totalCreditLimit = cards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
    const totalCurrentBalance = cards.reduce((sum, card) => sum + (card.current_balance || 0), 0);
    const totalUtilization = totalCreditLimit > 0 ? (totalCurrentBalance / totalCreditLimit) * 100 : 0;
    const totalMinimumDue = cards.reduce((sum, card) => sum + (card.minimum_due || 0), 0);
    const activeCards = cards.filter(card => card.auto_payment_enabled).length;

    return {
      totalCreditLimit,
      totalCurrentBalance,
      totalUtilization,
      totalMinimumDue,
      activeCards,
      protectedCards: cards.length,
    };
  };

  const metrics = calculateMetrics();

  // Render card list section
  const renderCardsList = () => {
    if (cardsLoading && cards.length === 0) {
      return <LoadingSpinner />;
    }

    if (cardsError) {
      return <ErrorDisplay error={cardsError} onRetry={loadDashboardData} />;
    }

    if (cards.length === 0) {
      return (
        <Surface style={styles.emptyState}>
          <View style={styles.emptyStateContent}>
            <Icon name="credit-card-outline" size={64} color="#CCCCCC" />
            <Title style={styles.emptyStateTitle}>No Cards Added</Title>
            <Paragraph style={styles.emptyStateText}>
              Add your first credit card to start enjoying interest-free payments with Lurk.
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => setShowAddCardModal(true)}
              style={styles.addCardButton}
            >
              Add Your First Card
            </Button>
          </View>
        </Surface>
      );
    }

    return (
      <View style={styles.cardsList}>
        {cards.map((card) => (
          <View key={card.id} style={styles.cardItem}>
            <CardComponent
              card={card}
              onSync={() => handleSyncCard(card.id)}
              onPayment={() => handleImmediatePayment(card.id)}
            />
          </View>
        ))}
      </View>
    );
  };

  // Render payment alerts
  const renderPaymentAlerts = () => {
    if (upcomingPayments.length === 0) {
      return (
        <Surface style={styles.emptyState}>
          <View style={styles.emptyStateContent}>
            <Icon name="bell-outline" size={64} color="#CCCCCC" />
            <Title style={styles.emptyStateTitle}>No Upcoming Payments</Title>
            <Paragraph style={styles.emptyStateText}>
              All your payments are up to date. Enjoy your interest-free credit!
            </Paragraph>
          </View>
        </Surface>
      );
    }

    return (
      <View style={styles.paymentAlerts}>
        <Title style={styles.sectionTitle}>Upcoming Payments</Title>
        {upcomingPayments.slice(0, 3).map((payment) => (
          <PaymentAlertItem
            key={payment.id}
            payment={payment}
            onPress={() => navigation.navigate('Payments')}
          />
        ))}
        {upcomingPayments.length > 3 && (
          <Button
            mode="text"
            onPress={() => navigation.navigate('Payments')}
            style={styles.viewAllButton}
          >
            View All ({upcomingPayments.length})
          </Button>
        )}
      </View>
    );
  };

  // Render savings overview
  const renderSavingsOverview = () => {
    if (!paymentSummary) {
      return null;
    }

    return (
      <Surface style={styles.savingsCard}>
        <Title style={styles.savingsTitle}>💰 Interest Saved This Month</Title>
        <Text style={styles.savingsAmount}>
          ₹{paymentSummary.total_saved?.toLocaleString() || '0'}
        </Text>
        <Paragraph style={styles.savingsSubtitle}>
          Lurk has saved you from paying {paymentSummary.late_fees_prevented || 0} in late fees!
        </Paragraph>
        <ProgressBar
          progress={0.75} // Example progress
          color="#4CAF50"
          style={styles.savingsProgress}
        />
      </Surface>
    );
  };

  // Render credit utilization
  const renderCreditUtilization = () => {
    const getUtilizationColor = (utilization) => {
      if (utilization >= 90) return '#F44336'; // Red
      if (utilization >= 70) return '#FF9800'; // Orange
      if (utilization >= 30) return '#FFC107'; // Yellow
      return '#4CAF50'; // Green
    };

    return (
      <Surface style={styles.utilizationCard}>
        <View style={styles.utilizationHeader}>
          <Title style={styles.utilizationTitle}>Credit Utilization</Title>
          <View style={styles.utilizationBadge}>
            <Text style={[
              styles.utilizationText,
              { color: getUtilizationColor(metrics.totalUtilization) },
            ]}>
              {Math.round(metrics.totalUtilization)}%
            </Text>
          </View>
        </View>
        <ProgressBar
          progress={metrics.totalUtilization / 100}
          color={getUtilizationColor(metrics.totalUtilization)}
          style={styles.utilizationProgress}
        />
        <View style={styles.utilizationStats}>
          <View style={styles.utilizationStat}>
            <Text style={styles.utilizationStatLabel}>Total Limit</Text>
            <Text style={styles.utilizationStatValue}>
              ₹{metrics.totalCreditLimit.toLocaleString()}
            </Text>
          </View>
          <View style={styles.utilizationStat}>
            <Text style={styles.utilizationStatLabel}>Current Balance</Text>
            <Text style={styles.utilizationStatValue}>
              ₹{metrics.totalCurrentBalance.toLocaleString()}
            </Text>
          </View>
          <View style={styles.utilizationStat}>
            <Text style={styles.utilizationStatLabel}>Active Cards</Text>
            <Text style={styles.utilizationStatValue}>
              {metrics.activeCards}/{metrics.protectedCards}
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  // Render quick actions
  const renderQuickActions = () => {
    return (
      <View style={styles.quickActions}>
        <Title style={styles.sectionTitle}>Quick Actions</Title>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Cards')}
          >
            <Icon name="plus-circle-outline" size={24} color="#4A90E2" />
            <Text style={styles.actionButtonText}>Add Card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Payments')}
          >
            <Icon name="bell-outline" size={24} color="#4A90E2" />
            <Text style={styles.actionButtonText}>View All Payments</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Premium')}
          >
            <Icon name="crown-outline" size={24} color="#4A90E2" />
            <Text style={styles.actionButtonText}>Upgrade Features</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (cardsLoading && cards.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <Title style={styles.welcomeTitle}>Welcome Back!</Title>
        <Paragraph style={styles.welcomeSubtitle}>
          Your cards are protected and payments are automated. Enjoy your interest-free credit!
        </Paragraph>
      </View>

      {/* Metrics Overview */}
      <View style={styles.metricsRow}>
        <Surface style={styles.metricCard}>
          <Icon name="credit-card" size={32} color="#4A90E2" />
          <Text style={styles.metricValue}>{metrics.protectedCards}</Text>
          <Text style={styles.metricLabel}>Protected Cards</Text>
        </Surface>
        <Surface style={styles.metricCard}>
          <Icon name="shield-check" size={32} color="#4CAF50" />
          <Text style={styles.metricValue}>
            ₹{paymentSummary?.total_saved || '0'}
          </Text>
          <Text style={styles.metricLabel}>Total Saved</Text>
        </Surface>
        <Surface style={styles.metricCard}>
          <Icon name="bell" size={32} color="#FF9800" />
          <Text style={styles.metricValue}>
            {upcomingPayments.length}
          </Text>
          <Text style={styles.metricLabel}>Upcoming</Text>
        </Surface>
      </View>

      <Divider style={styles.divider} />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {renderCardsList()}
          {renderPaymentAlerts()}
          {renderSavingsOverview()}
          {renderCreditUtilization()}
          {renderQuickActions()}
        </>
      )}

      {activeTab === 'analytics' && (
        <View style={styles.analyticsContainer}>
          <SavingsChart data={paymentSummary} />
          <Surface style={styles.insightsCard}>
            <Title style={styles.insightsTitle}>💡 Smart Insights</Title>
            <Paragraph style={styles.insightsText}>
              Your credit utilization is optimal. Keep up the great work!
            </Paragraph>
          </Surface>
        </Surface>
        </View>
      )}
    </ScrollView>

    {/* Floating Action Button */}
    <FAB
      style={styles.fab}
      icon="plus"
      label="Add Card"
      color="#4A90E2"
      onPress={() => setShowAddCardModal(true)}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 24,
  },
  cardsList: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  cardItem: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  emptyStateContent: {
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  addCardButton: {
    marginTop: 16,
    backgroundColor: '#4A90E2',
  },
  paymentAlerts: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  viewAllButton: {
    alignSelf: 'center',
    marginTop: 16,
  },
  savingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  savingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  savingsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  savingsSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  savingsProgress: {
    marginTop: 8,
    height: 8,
    borderRadius: 4,
  },
  utilizationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  utilizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  utilizationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  utilizationBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  utilizationText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  utilizationProgress: {
    marginTop: 12,
    height: 12,
    borderRadius: 6,
  },
  utilizationStats: {
    marginTop: 16,
  },
  utilizationStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  utilizationStatLabel: {
    fontSize: 14,
    color: '#666',
  },
  utilizationStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  quickActions: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
    textAlign: 'center',
  },
  analyticsContainer: {
    paddingHorizontal: 16,
  },
  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  insightsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4A90E2',
    borderRadius: 28,
  },
});

export default DashboardScreen;