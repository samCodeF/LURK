/**
 * Payment Alerts Screen - View and Manage Payment Notifications
 * Shows upcoming payments, history, and payment confirmations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
  Chip,
  Searchbar,
  SegmentedButtons,
  Divider,
  List,
  Badge,
  ProgressBar,
  Modal,
  Portal,
  Provider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useSelector, useDispatch } from 'react-redux';

// Import components
import PaymentAlertItem from '../components/PaymentAlertItem';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';
import EmptyState from '../components/EmptyState';

// Import Redux actions and selectors
import {
  fetchUpcomingPayments,
  fetchPaymentHistory,
  createPayment,
  schedulePayment,
  cancelScheduledPayment,
} from '../store/slices/paymentsSlice';
import {
  selectUpcomingPayments,
  selectPaymentHistory,
  selectPaymentSummary,
  selectPaymentsLoading,
  selectPaymentsError,
} from '../store/selectors';

const { width, height } = Dimensions.get('window');

const PaymentAlertsScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  // Selectors
  const upcomingPayments = useSelector(selectUpcomingPayments);
  const paymentHistory = useSelector(selectPaymentHistory);
  const paymentSummary = useSelector(selectPaymentSummary);
  const paymentsLoading = useSelector(selectPaymentsLoading);
  const paymentsError = useSelector(selectPaymentsError);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    payment_type: 'all',
    date_range: 'all',
  });
  const [sortBy, setSortBy] = useState('due_date');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('minimum_due');

  // Data on component mount
  useEffect(() => {
    loadPaymentData();
  }, []);

  // Navigation header setup
  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Payment Alerts',
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={styles.headerButton}
          >
            <Icon name="filter-variant" size={24} color="#4A90E2" />
          </TouchableOpacity>
        </View>
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

  // Load payment data
  const loadPaymentData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchUpcomingPayments()),
        dispatch(fetchPaymentHistory()),
      ]);
    } catch (error) {
      console.error('Error loading payment data:', error);
    }
  }, [dispatch]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPaymentData();
    } finally {
      setRefreshing(false);
    }
  }, [loadPaymentData]);

  // Handle immediate payment
  const handleImmediatePayment = useCallback(async (payment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.minimum_due.toString());
    setShowPaymentModal(true);
  }, []);

  // Handle schedule payment
  const handleSchedulePayment = useCallback(async (payment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.minimum_due.toString());
    setShowPaymentModal(true);
  }, []);

  // Process payment
  const processPayment = useCallback(async (payment, type, amount, scheduledDate) => {
    try {
      if (type === 'immediate') {
        await dispatch(createPayment({
          card_id: payment.card_id,
          payment_preference: 'custom_amount',
          custom_amount: parseFloat(amount),
        }));
        Alert.alert('Success', 'Payment initiated successfully!');
      } else if (type === 'scheduled' && scheduledDate) {
        await dispatch(schedulePayment({
          card_id: payment.card_id,
          scheduled_date: scheduledDate,
          scheduled_amount: parseFloat(amount),
          payment_type: 'scheduled',
        }));
        Alert.alert('Success', 'Payment scheduled successfully!');
      }
      setShowPaymentModal(false);
      setSelectedPayment(null);
      await loadPaymentData();
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
  }, [dispatch, loadPaymentData]);

  // Handle cancel scheduled payment
  const handleCancelScheduledPayment = useCallback(async (payment) => {
    Alert.alert(
      'Cancel Scheduled Payment',
      'Are you sure you want to cancel this scheduled payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cancel Payment',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(cancelScheduledPayment({ scheduleId: payment.schedule_id }));
              Alert.alert('Success', 'Scheduled payment cancelled!');
              await loadPaymentData();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel scheduled payment. Please try again.');
            }
          },
        },
      ],
    );
  }, [dispatch, loadPaymentData]);

  // Handle view payment details
  const handleViewPayment = useCallback(async (payment) => {
    navigation.navigate('PaymentDetails', { paymentId: payment.id });
  }, [navigation]);

  // Filter and sort payments
  const getFilteredAndSortedPayments = useCallback(() => {
    const payments = activeTab === 'upcoming' ? upcomingPayments : paymentHistory;

    let filteredPayments = [...payments];

    // Apply search filter
    if (searchQuery) {
      filteredPayments = filteredPayments.filter(payment =>
        payment.card_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.card_last4?.includes(searchQuery) ||
        payment.status?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filteredPayments = filteredPayments.filter(payment =>
        payment.status === filters.status
      );
    }

    // Apply payment type filter
    if (filters.payment_type !== 'all') {
      filteredPayments = filteredPayments.filter(payment =>
        payment.payment_type === filters.payment_type
      );
    }

    // Apply date range filter
    if (filters.date_range !== 'all') {
      const now = new Date();
      filteredPayments = filteredPayments.filter(payment => {
        const paymentDate = new Date(payment.due_date || payment.created_at);

        switch (filters.date_range) {
          case 'today':
            return paymentDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return paymentDate >= weekAgo;
          case 'month':
            return paymentDate.getMonth() === now.getMonth() &&
                   paymentDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filteredPayments.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          return new Date(a.due_date || 0) - new Date(b.due_date || 0);
        case 'amount':
          return (b.scheduled_amount || b.minimum_due || 0) - (a.scheduled_amount || a.minimum_due || 0);
        case 'card_name':
          return (a.card_name || '').localeCompare(b.card_name || '');
        case 'status':
          return a.status.localeCompare(b.status);
        case 'created_at':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default:
          return 0;
      }
    });

    return filteredPayments;
  }, [activeTab, upcomingPayments, paymentHistory, searchQuery, filters, sortBy]);

  // Calculate payment statistics
  const getPaymentStatistics = useCallback(() => {
    const upcomingTotal = upcomingPayments.reduce((sum, payment) =>
      sum + (payment.minimum_due || 0), 0);
    const upcomingCount = upcomingPayments.length;
    const urgentCount = upcomingPayments.filter(payment => {
      const dueDate = new Date(payment.due_date);
      const now = new Date();
      const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
      return hoursUntilDue <= 24; // Due within 24 hours
    }).length;

    const monthlyTotal = paymentSummary?.total_saved || 0;
    const lateFeesPrevented = paymentSummary?.late_fees_prevented || 0;

    return {
      upcomingTotal,
      upcomingCount,
      urgentCount,
      monthlyTotal,
      lateFeesPrevented,
    };
  }, [upcomingPayments, paymentSummary]);

  // Render payment statistics
  const renderPaymentStatistics = () => {
    const stats = getPaymentStatistics();

    return (
      <Surface style={styles.statsCard}>
        <Title style={styles.statsTitle}>Payment Overview</Title>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.upcomingCount}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{stats.upcomingTotal.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Amount</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.urgentCount}</Text>
            <Text style={styles.statLabel}>Urgent (24h)</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              ₹{stats.monthlyTotal.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
        </View>

        {stats.lateFeesPrevented > 0 && (
          <View style={styles.savingsInfo}>
            <Icon name="shield-check" size={20} color="#4CAF50" />
            <Text style={styles.savingsText}>
              {stats.lateFeesPrevented} late fees prevented this month!
            </Text>
          </View>
        )}
      </Surface>
    );
  };

  // Render payment modal
  const renderPaymentModal = () => {
    if (!selectedPayment) return null;

    return (
      <Portal>
        <Modal
          visible={showPaymentModal}
          onDismiss={() => {
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>
            {activeTab === 'upcoming' ? 'Schedule Payment' : 'Make Payment'}
          </Title>

          <View style={styles.paymentCard}>
            <Text style={styles.cardName}>{selectedPayment.card_name}</Text>
            <Text style={styles.cardDetails}>
              {selectedPayment.bank_name} •••• {selectedPayment.card_last4}
            </Text>
            <Text style={styles.cardDueDate}>
              Due: {new Date(selectedPayment.due_date).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Payment Amount</Text>
            <View style={styles.amountButtons}>
              <Chip
                selected={paymentType === 'minimum_due'}
                onPress={() => {
                  setPaymentType('minimum_due');
                  setPaymentAmount(selectedPayment.minimum_due.toString());
                }}
                style={styles.amountChip}
              >
                Min Due: ₹{selectedPayment.minimum_due}
              </Chip>
              <Chip
                selected={paymentType === 'total_due'}
                onPress={() => {
                  setPaymentType('total_due');
                  setPaymentAmount(selectedPayment.total_due.toString());
                }}
                style={styles.amountChip}
              >
                Total: ₹{selectedPayment.total_due}
              </Chip>
              <Chip
                selected={paymentType === 'custom_amount'}
                onPress={() => setPaymentType('custom_amount')}
                style={styles.amountChip}
              >
                Custom
              </Chip>
            </View>

            {paymentType === 'custom_amount' && (
              <View style={styles.customAmountSection}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.customAmountInput}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                />
              </View>
            )}
          </View>

          {activeTab === 'upcoming' && (
            <View style={styles.scheduleSection}>
              <Text style={styles.scheduleLabel}>Schedule For</Text>
              <View style={styles.scheduleOptions}>
                <Chip
                  selected={selectedPayment.payment_type === 'automatic'}
                  style={styles.scheduleChip}
                >
                  Automatic
                </Chip>
                <Chip
                  selected={selectedPayment.payment_type === 'manual'}
                  style={styles.scheduleChip}
                >
                  Manual
                </Chip>
              </View>
            </View>
          )}

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => {
                setShowPaymentModal(false);
                setSelectedPayment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                if (paymentAmount && parseFloat(paymentAmount) > 0) {
                  if (activeTab === 'upcoming') {
                    // Default to scheduling for upcoming payments
                    const scheduledDate = new Date(selectedPayment.due_date);
                    scheduledDate.setDate(scheduledDate.getDate() - 1); // Schedule 1 day before due
                    processPayment(selectedPayment, 'scheduled', paymentAmount, scheduledDate);
                  } else {
                    processPayment(selectedPayment, 'immediate', paymentAmount);
                  }
                } else {
                  Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
                }
              }}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
              style={styles.payButton}
            >
              {activeTab === 'upcoming' ? 'Schedule Payment' : 'Pay Now'}
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Render filter modal
  const renderFilterModal = () => {
    return (
      <Portal>
        <Modal
          visible={showFilterModal}
          onDismiss={() => setShowFilterModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Filter Payments</Title>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.chipContainer}>
              {['all', 'pending', 'completed', 'failed', 'cancelled'].map(status => (
                <Chip
                  key={status}
                  selected={filters.status === status}
                  onPress={() => setFilters({ ...filters, status })}
                  style={styles.chip}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Payment Type</Text>
            <View style={styles.chipContainer}>
              {['all', 'minimum_due', 'total_due', 'custom_amount'].map(type => (
                <Chip
                  key={type}
                  selected={filters.payment_type === type}
                  onPress={() => setFilters({ ...filters, payment_type: type })}
                  style={styles.chip}
                >
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.chipContainer}>
              {['all', 'today', 'week', 'month'].map(range => (
                <Chip
                  key={range}
                  selected={filters.date_range === range}
                  onPress={() => setFilters({ ...filters, date_range: range })}
                  style={styles.chip}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => {
                setFilters({
                  status: 'all',
                  payment_type: 'all',
                  date_range: 'all',
                });
                setSortBy('due_date');
              }}
            >
              Reset
            </Button>
            <Button
              mode="contained"
              onPress={() => setShowFilterModal(false)}
              style={styles.applyButton}
            >
              Apply
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Render payment item
  const renderPaymentItem = ({ item }) => {
    return (
      <PaymentAlertItem
        payment={item}
        onPress={() => handleViewPayment(item)}
        onPay={() => handleImmediatePayment(item)}
        onSchedule={() => handleSchedulePayment(item)}
        onCancel={() => handleCancelScheduledPayment(item)}
      />
    );
  };

  const filteredPayments = getFilteredAndSortedPayments();

  if (paymentsLoading && upcomingPayments.length === 0 && paymentHistory.length === 0) {
    return <LoadingSpinner />;
  }

  if (paymentsError) {
    return <ErrorDisplay error={paymentsError} onRetry={loadPaymentData} />;
  }

  return (
    <Provider>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <Searchbar
            placeholder="Search payments..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
          />
        </View>

        {/* Statistics */}
        {renderPaymentStatistics()}

        {/* Tab Navigation */}
        <View style={styles.tabSection}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={setActiveTab}
            buttons={[
              { value: 'upcoming', label: 'Upcoming', icon: 'bell' },
              { value: 'history', label: 'History', icon: 'history' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <EmptyState
            icon="bell-outline"
            title={`No ${activeTab} Payments`}
            message={
              searchQuery || filters.status !== 'all' || filters.payment_type !== 'all'
                ? 'Try adjusting your search or filters'
                : activeTab === 'upcoming'
                ? 'All your payments are up to date. Enjoy your interest-free credit!'
                : 'No payment history available yet.'
            }
          />
        ) : (
          <FlatList
            data={filteredPayments}
            renderItem={renderPaymentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.paymentsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListFooterComponent={<View style={styles.listFooter} />}
          />
        )}

        {/* Payment Modal */}
        {renderPaymentModal()}

        {/* Filter Modal */}
        {renderFilterModal()}
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    fontSize: 16,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  savingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  savingsText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    flex: 1,
  },
  tabSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  segmentedButtons: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  paymentsList: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for modals
  },
  listFooter: {
    height: 50,
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
  paymentCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardDueDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  amountSection: {
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  amountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  amountChip: {
    marginBottom: 4,
  },
  customAmountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 8,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scheduleSection: {
    marginBottom: 20,
  },
  scheduleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  scheduleOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  scheduleChip: {
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payButton: {
    backgroundColor: '#4A90E2',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  applyButton: {
    backgroundColor: '#4A90E2',
  },
});

export default PaymentAlertsScreen;