/**
 * Cards List Screen - Manage Credit Cards
 * Shows all cards with status, sync controls, and bulk actions
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
  TextInput,
} from 'react-native';
import {
  Surface,
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Searchbar,
  FAB,
  Modal,
  Portal,
  Provider,
  ProgressBar,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useSelector, useDispatch } from 'react-redux';

// Import components
import CardComponent from '../components/CardComponent';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';
import EmptyState from '../components/EmptyState';

// Import Redux actions and selectors
import {
  fetchCards,
  syncCard,
  syncAllCards,
  deleteCard,
  toggleAutomation,
} from '../store/slices/cardsSlice';
import {
  selectCards,
  selectCardsLoading,
  selectCardsError,
  selectSyncingCards,
} from '../store/selectors';

const { width, height } = Dimensions.get('window');

const CardsListScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  // Selectors
  const cards = useSelector(selectCards);
  const cardsLoading = useSelector(selectCardsLoading);
  const cardsError = useSelector(selectCardsError);
  const syncingCards = useSelector(selectSyncingCards);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCards, setSelectedCards] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Data on component mount
  useEffect(() => {
    loadCards();
  }, []);

  // Navigation header setup
  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'My Cards',
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={styles.headerButton}
          >
            <Icon name="filter-variant" size={24} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowBulkActions(!showBulkActions)}
            style={styles.headerButton}
          >
            <Icon name="checkbox-multiple-marked" size={24} color="#4A90E2" />
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
  }, [navigation, showBulkActions]);

  // Load cards data
  const loadCards = useCallback(async () => {
    try {
      await dispatch(fetchCards());
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  }, [dispatch]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCards();
    } finally {
      setRefreshing(false);
    }
  }, [loadCards]);

  // Handle card sync
  const handleSyncCard = useCallback(async (cardId) => {
    try {
      await dispatch(syncCard(cardId));
      Alert.alert('Success', 'Card synced successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync card. Please try again.');
    }
  }, [dispatch]);

  // Handle sync all cards
  const handleSyncAllCards = useCallback(async () => {
    try {
      await dispatch(syncAllCards());
      Alert.alert('Success', 'All cards synced successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync some cards. Please check individual cards.');
    }
  }, [dispatch]);

  // Handle delete card
  const handleDeleteCard = useCallback(async (cardId) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteCard(cardId));
              Alert.alert('Success', 'Card deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete card. Please try again.');
            }
          },
        },
      ],
    );
  }, [dispatch]);

  // Handle toggle automation
  const handleToggleAutomation = useCallback(async (cardId) => {
    try {
      await dispatch(toggleAutomation(cardId));
      Alert.alert('Success', 'Automation settings updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update automation. Please try again.');
    }
  }, [dispatch]);

  // Handle immediate payment
  const handleImmediatePayment = useCallback(async (cardId) => {
    navigation.navigate('Payment', { cardId, type: 'immediate' });
  }, [navigation]);

  // Filter and sort cards
  const getFilteredAndSortedCards = () => {
    let filteredCards = [...cards];

    // Apply search filter
    if (searchQuery) {
      filteredCards = filteredCards.filter(card =>
        card.card_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.card_last4?.includes(searchQuery)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filteredCards = filteredCards.filter(card => {
        switch (filterStatus) {
          case 'active':
            return card.auto_payment_enabled && card.api_status === 'connected';
          case 'inactive':
            return !card.auto_payment_enabled;
          case 'error':
            return card.api_status === 'error';
          case 'syncing':
            return card.api_status === 'syncing';
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filteredCards.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.card_name || a.bank_name || '').localeCompare(b.card_name || b.bank_name || '');
        case 'bank':
          return (a.bank_name || '').localeCompare(b.bank_name || '');
        case 'balance':
          return (b.current_balance || 0) - (a.current_balance || 0);
        case 'due':
          return new Date(a.payment_due_date || 0) - new Date(b.payment_due_date || 0);
        case 'status':
          return b.auto_payment_enabled - a.auto_payment_enabled;
        default:
          return 0;
      }
    });

    return filteredCards;
  };

  // Toggle card selection
  const toggleCardSelection = useCallback((cardId) => {
    setSelectedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  }, []);

  // Handle bulk action
  const handleBulkAction = useCallback(async (action) => {
    if (selectedCards.length === 0) {
      Alert.alert('No Cards Selected', 'Please select at least one card to perform bulk actions.');
      return;
    }

    switch (action) {
      case 'sync':
        try {
          await Promise.all(selectedCards.map(cardId => dispatch(syncCard(cardId))));
          Alert.alert('Success', `Synced ${selectedCards.length} card(s) successfully!`);
          setSelectedCards([]);
        } catch (error) {
          Alert.alert('Error', 'Failed to sync some cards. Please check individual cards.');
        }
        break;

      case 'enable_automation':
        try {
          await Promise.all(selectedCards.map(cardId => dispatch(toggleAutomation(cardId))));
          Alert.alert('Success', `Enabled automation for ${selectedCards.length} card(s)!`);
          setSelectedCards([]);
        } catch (error) {
          Alert.alert('Error', 'Failed to enable automation for some cards.');
        }
        break;

      case 'disable_automation':
        try {
          await Promise.all(selectedCards.map(cardId => dispatch(toggleAutomation(cardId))));
          Alert.alert('Success', `Disabled automation for ${selectedCards.length} card(s)!`);
          setSelectedCards([]);
        } catch (error) {
          Alert.alert('Error', 'Failed to disable automation for some cards.');
        }
        break;

      case 'delete':
        Alert.alert(
          'Delete Selected Cards',
          `Are you sure you want to delete ${selectedCards.length} card(s)? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await Promise.all(selectedCards.map(cardId => dispatch(deleteCard(cardId))));
                  Alert.alert('Success', `Deleted ${selectedCards.length} card(s) successfully!`);
                  setSelectedCards([]);
                } catch (error) {
                  Alert.alert('Error', 'Failed to delete some cards.');
                }
              },
            },
          ],
        );
        break;
    }
  }, [selectedCards, dispatch]);

  // Get card statistics
  const getCardStats = () => {
    const totalCards = cards.length;
    const activeCards = cards.filter(card => card.auto_payment_enabled).length;
    const connectedCards = cards.filter(card => card.api_status === 'connected').length;
    const errorCards = cards.filter(card => card.api_status === 'error').length;
    const totalBalance = cards.reduce((sum, card) => sum + (card.current_balance || 0), 0);
    const totalLimit = cards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
    const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

    return {
      totalCards,
      activeCards,
      connectedCards,
      errorCards,
      totalBalance,
      totalLimit,
      utilization,
    };
  };

  // Render card item
  const renderCardItem = ({ item }) => {
    const isSelected = selectedCards.includes(item.id);
    const isSyncing = syncingCards.includes(item.id);

    return (
      <View style={styles.cardItem}>
        {showBulkActions && (
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleCardSelection(item.id)}
          >
            <Icon
              name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={isSelected ? '#4A90E2' : '#CCCCCC'}
            />
          </TouchableOpacity>
        )}

        <CardComponent
          card={item}
          onSync={() => handleSyncCard(item.id)}
          onPayment={() => handleImmediatePayment(item.id)}
          onEdit={() => navigation.navigate('EditCard', { cardId: item.id })}
          onDelete={() => handleDeleteCard(item.id)}
          onToggleAutomation={() => handleToggleAutomation(item.id)}
          syncStatus={{ syncing: isSyncing }}
          style={styles.cardComponent}
        />
      </View>
    );
  };

  // Render bulk actions
  const renderBulkActions = () => {
    if (!showBulkActions) return null;

    return (
      <Surface style={styles.bulkActionsBar}>
        <View style={styles.bulkActionsContent}>
          <Text style={styles.selectedCount}>
            {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} selected
          </Text>
          <View style={styles.bulkActionButtons}>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: '#4A90E2' }]}
              onPress={() => handleBulkAction('sync')}
            >
              <Icon name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.bulkActionText}>Sync</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleBulkAction('enable_automation')}
            >
              <Icon name="play" size={20} color="#FFFFFF" />
              <Text style={styles.bulkActionText}>Enable</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: '#FF9800' }]}
              onPress={() => handleBulkAction('disable_automation')}
            >
              <Icon name="pause" size={20} color="#FFFFFF" />
              <Text style={styles.bulkActionText}>Disable</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: '#F44336' }]}
              onPress={() => handleBulkAction('delete')}
            >
              <Icon name="delete" size={20} color="#FFFFFF" />
              <Text style={styles.bulkActionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Surface>
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
          <Title style={styles.modalTitle}>Filter & Sort Cards</Title>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.chipContainer}>
              {['all', 'active', 'inactive', 'error', 'syncing'].map(status => (
                <Chip
                  key={status}
                  selected={filterStatus === status}
                  onPress={() => setFilterStatus(status)}
                  style={styles.chip}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort By</Text>
            <View style={styles.chipContainer}>
              {['name', 'bank', 'balance', 'due', 'status'].map(sort => (
                <Chip
                  key={sort}
                  selected={sortBy === sort}
                  onPress={() => setSortBy(sort)}
                  style={styles.chip}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => {
                setFilterStatus('all');
                setSortBy('name');
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

  // Render statistics
  const renderStatistics = () => {
    const stats = getCardStats();

    return (
      <Surface style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalCards}</Text>
            <Text style={styles.statLabel}>Total Cards</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.activeCards}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(stats.utilization)}%</Text>
            <Text style={styles.statLabel}>Utilization</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              ₹{(stats.totalBalance / 1000).toFixed(0)}K
            </Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
        </View>
        <ProgressBar
          progress={stats.utilization / 100}
          color={stats.utilization > 70 ? '#F44336' : stats.utilization > 50 ? '#FF9800' : '#4CAF50'}
          style={styles.utilizationBar}
        />
      </Surface>
    );
  };

  const filteredCards = getFilteredAndSortedCards();

  if (cardsLoading && cards.length === 0) {
    return <LoadingSpinner />;
  }

  if (cardsError) {
    return <ErrorDisplay error={cardsError} onRetry={loadCards} />;
  }

  return (
    <Provider>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <Searchbar
            placeholder="Search cards..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
          />
        </View>

        {/* Statistics */}
        {renderStatistics()}

        {/* Cards List */}
        {filteredCards.length === 0 ? (
          <EmptyState
            icon="credit-card-outline"
            title="No Cards Found"
            message={
              searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first credit card to start enjoying interest-free payments with Lurk.'
            }
            actionLabel="Add Card"
            onAction={() => navigation.navigate('AddCard')}
          />
        ) : (
          <FlatList
            data={filteredCards}
            renderItem={renderCardItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cardsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListHeaderComponent={
              cards.length > 0 && (
                <View style={styles.syncAllSection}>
                  <Button
                    mode="outlined"
                    onPress={handleSyncAllCards}
                    icon="refresh"
                    loading={syncingCards.length > 0}
                    disabled={syncingCards.length > 0}
                    style={styles.syncAllButton}
                  >
                    Sync All Cards
                  </Button>
                </View>
              )
            }
          />
        )}

        {/* Bulk Actions Bar */}
        {renderBulkActions()}

        {/* Filter Modal */}
        {renderFilterModal()}

        {/* Floating Action Button */}
        <FAB
          style={styles.fab}
          icon="plus"
          label="Add Card"
          onPress={() => navigation.navigate('AddCard')}
        />
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
    marginLeft: 8,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  utilizationBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
  },
  syncAllSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  syncAllButton: {
    borderColor: '#4A90E2',
  },
  cardsList: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for FAB
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 20,
    padding: 8,
  },
  cardComponent: {
    flex: 1,
  },
  bulkActionsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
    paddingBottom: 32, // Extra padding for safe area
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bulkActionsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  filterSection: {
    marginBottom: 20,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  applyButton: {
    backgroundColor: '#4A90E2',
  },
  fab: {
    position: 'absolute',
    bottom: 80, // Above bulk actions if visible
    right: 16,
    backgroundColor: '#4A90E2',
  },
});

export default CardsListScreen;