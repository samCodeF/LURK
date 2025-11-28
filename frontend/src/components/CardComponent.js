/**
 * Card Component - Reusable Credit Card Display
 * Shows card details with actions for sync, payments, etc.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useTheme } from 'react-native-paper';
import { Card } from 'react-native-elements';

const CardComponent = ({
  card,
  onSync,
  onPayment,
  onEdit,
  onDelete,
  onToggleAutomation,
  syncStatus,
  style = {},
}) => {
  const { colors, typography } = useTheme();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onSync?.(card.id);
    } catch (error) {
      console.error('Error syncing card:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onSync, card.id]);

  const getCardColor = (brand) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '#1976D2';
      case 'mastercard':
      case 'mc':
        return '#EB001B';
      case 'amex':
      case 'american express':
        return '#006FC7';
      case 'rupay':
        return '#F79E44';
      default:
        return '#4A90E2';
    }
  };

  const getCardIcon = (brand) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'card-credit-card-outline';
      case 'mastercard':
      case 'mc':
        return 'card-credit-card';
      case 'amex':
      case 'american express':
        return 'card-credit-card';
      case 'rupay':
        return 'card-credit-card';
      default:
        return 'credit-card';
    }
  };

  const getPaymentStatusColor = (dueDate, minimumDue) => {
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60));

    if (daysUntilDue < 0) {
      return colors.error;
    } else if (daysUntilDue <= 3) {
      return colors.warning;
    } else {
      return colors.primary;
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getAutomatedStatus = () => {
    if (!card.auto_payment_enabled) {
      return {
        text: 'Automation Disabled',
        color: colors.textSecondary,
        icon: 'play-circle-outline',
      };
    } else if (card.api_status === 'connected') {
      return {
        text: 'Active',
        color: colors.success,
        icon: 'check-circle',
      };
    } else if (card.api_status === 'syncing') {
      return {
        text: 'Syncing...',
        color: colors.primary,
        icon: 'refresh',
      };
    } else if (card.api_status === 'error') {
      return {
        text: 'Error',
        color: colors.error,
        icon: 'alert-circle',
      };
    } else {
      return {
        text: 'Needs Setup',
        color: colors.textSecondary,
        icon: 'help-circle',
      };
    }
  };

  const automatedStatus = getAutomatedStatus();

  return (
    <Card containerStyle={[styles.card, { backgroundColor: getCardColor(card.card_brand) }, style]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardBrandRow}>
          <Text style={[styles.cardBrand, { color: colors.white }]}>
            {card.card_brand?.toUpperCase() || 'CARD'}
          </Text>
          {automatedStatus.icon && (
            <Icon
              name={automatedStatus.icon}
              size={20}
              color={colors.white}
              style={styles.automatedIcon}
            />
          )}
        </View>
        <View style={styles.cardNumbers}>
          <Text style={[styles.cardLast4, { color: colors.white }]}>
            •••• • {card.card_last4}
          </Text>
          {card.expiry_month && card.expiry_year && (
            <Text style={[styles.cardExpiry, { color: colors.white }]}>
              {String(card.expiry_month).padStart(2, '0')}/{card.expiry_year}
            </Text>
          )}
        </View>
        </View>
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.white}
          colors={[colors.primary]}
          progressBackgroundColor={colors.white}
          progressViewOffset={-30}
        />
      </View>

      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.white }]}>
          {card.card_name || `${card.bank_name.charAt(0).toUpperCase() + card.bank_name.slice(1)} Card`}
        </Text>
        {automatedStatus.text && (
          <View style={styles.automatedStatusRow}>
            <Icon
              name={automatedStatus.icon}
              size={16}
              color={automatedStatus.color}
              style={styles.automatedStatusIcon}
            />
            <Text style={[styles.automatedStatusText, { color: automatedStatus.color }]}>
              {automatedStatus.text}
            </Text>
          </View>
        )}
      </View>
      </View>

      {/* Payment Info */}
      <View style={styles.paymentInfo}>
        {card.minimum_due > 0 && (
          <View style={styles.paymentRow}>
            <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>
              Minimum Due
            </Text>
            <Text style={[styles.paymentAmount, { color: colors.white }]}>
              {formatAmount(card.minimum_due)}
            </Text>
          </View>
        )}

        <View style={styles.paymentRow}>
          <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>
              Total Due
            </Text>
            <Text style={[styles.paymentAmount, { color: colors.white }]}>
              {formatAmount(card.total_due)}
            </Text>
          </View>
        )}

        {card.payment_due_date && (
          <View style={styles.paymentRow}>
            <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>
              Due Date
            </Text>
            <Text style={[styles.paymentDate, { color: getPaymentStatusColor(card.payment_due_date, card.minimum_due) }]}>
              {formatDate(card.payment_due_date)}
            </Text>
          </View>
        )}
      </View>

      {/* Utilization */}
      <View style={styles.utilizationRow}>
        <Text style={[styles.utilizationLabel, { color: colors.textSecondary }]}>
          Utilization
        </Text>
        <View style={styles.utilizationBar}>
          <View
            style={[
              styles.utilizationBarFill,
              {
                width: `${Math.min((card.current_balance / card.credit_limit) * 100, 100)}%`,
                backgroundColor: card.current_balance / card.credit_limit > 0.7 ? colors.error :
                                card.current_balance / card.credit_limit > 0.5 ? colors.warning : colors.primary
              }
            ]}
          />
        </View>
        </View>
        <Text style={[styles.utilizationText, { color: colors.white }]}>
          {Math.round((card.current_balance / card.credit_limit) * 100)}%
        </Text>
      </View>
    </View>

    {/* Card Actions */}
    <View style={styles.cardActions}>
      <View style={styles.actionButtons}>
        {onSync && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
            disabled={isRefreshing || !card.auto_payment_enabled}
          >
            <Icon
              name="refresh"
              size={20}
              color={colors.white}
            />
            <Text style={styles.actionButtonText}>Sync</Text>
          </TouchableOpacity>
        )}

        {onPayment && card.auto_payment_enabled && card.minimum_due > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => onPayment(card.id)}
          >
            <Icon
              name="credit-card-outline"
              size={20}
              color={colors.white}
            />
            <Text style={styles.actionButtonText}>Pay Now</Text>
          </TouchableOpacity>
        )}

        {onEdit && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={() => onEdit(card.id)}
          >
            <Icon
              name="edit"
              size={20}
              color={colors.white}
            />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        )}

        {onToggleAutomation && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: card.auto_payment_enabled ? colors.warning : colors.primary
              }
            ]}
            onPress={() => onToggleAutomation(card.id)}
          >
            <Icon
              name={card.auto_payment_enabled ? "pause-circle-outline" : "play-circle-outline"}
              size={20}
              color={colors.white}
            />
            <Text style={styles.actionButtonText}>
              {card.auto_payment_enabled ? 'Pause' : 'Enable'} Auto-Pay
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statusIndicator}>
        {syncStatus?.syncing === card.id && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.statusIndicatorIcon}
          />
        )}
        {card.api_status === 'connected' && (
          <Icon
            name="check-circle"
            size={16}
            color={colors.success}
            style={styles.statusIndicatorIcon}
          />
        )}
        {card.api_status === 'error' && (
          <Icon
            name="alert-circle"
            size={16}
            color={colors.error}
            style={styles.statusIndicatorIcon}
          />
        )}
      </View>
    </View>

    {/* Delete Button */}
    {onDelete && (
      <View style={styles.deleteSection}>
        <TouchableOpacity
          style={[styles.deleteButton]}
          onPress={() => onDelete(card.id)}
        >
          <Icon
            name="delete-forever"
            size={20}
            color={colors.error}
          />
        </TouchableOpacity>
      </View>
    )}
  </Card>
);
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cardBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBrand: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  automatedIcon: {
    marginLeft: 8,
  },
  automatedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  automatedStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cardNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  cardLast4: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  cardExpiry: {
    fontSize: 12,
    opacity: 0.9,
  },
  cardInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  paymentInfo: {
    gap: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  utilizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    },
  utilizationLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 8,
  },
  utilizationBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
  },
  utilizationBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  utilizationText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  deleteSection: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  statusIndicatorIcon: {
    marginRight: 8,
  },
});

export default React.memo(CardComponent);