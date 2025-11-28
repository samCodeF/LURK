/**
 * Payment Alert Item Component - Individual Payment Alert Display
 * Shows payment status, amount, and quick actions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useTheme } from 'react-native-paper';

const PaymentAlertItem = ({
  payment,
  onRetry,
  onCancel,
  onDetails,
  style = {},
}) => {
  const { colors, typography } = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);

  const getPaymentStatus = (status) => {
    switch (status) {
      case 'pending':
        return { color: colors.warning, text: 'Processing...', icon: 'clock-outline' };
      case 'processing':
        return { color: colors.primary, text: 'Authorizing...', icon: 'sync' };
      case 'completed':
        return { color: colors.success, text: 'Payment Successful', icon: 'check-circle-outline' };
      case 'failed':
        return { color: colors.error, text: 'Payment Failed', icon: 'alert-circle-outline' };
      case 'cancelled':
        return { color: colors.textSecondary, text: 'Payment Cancelled', icon: 'cancel' };
      default:
        return { color: colors.textSecondary, text: 'Unknown Status', icon: 'help-circle-outline' };
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const statusInfo = getPaymentStatus(payment.status);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  return (
    <View style={[styles.alertItem, style]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.alertHeader}
        onPress={toggleExpanded}
      >
        <View style={styles.alertHeaderLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
        <View style={styles.alertHeaderRight}>
          <Icon
            name={statusInfo.icon}
            size={20}
            color={statusInfo.color}
            style={styles.headerIcon}
          />
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
            style={styles.expandIcon}
          />
        </View>
      </TouchableOpacity>

      {/* Expandable Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Payment Details */}
          <View style={styles.paymentDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>
                {formatAmount(payment.amount || 0)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Date:</Text>
              <Text style={styles.detailValue}>
                {payment.completed_at ? formatDate(payment.completed_at) : formatDate(payment.created_at)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Time:</Text>
              <Text style={styles.detailValue}>
                {payment.completed_at ? formatTime(payment.completed_at) : '--:--'}
              </Text>
            </View>

            {payment.payment_method && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Method:</Text>
                <Text style={styles.detailValue}>
                  {payment.payment_method?.charAt(0)?.toUpperCase() + payment.payment_method?.slice(1) || 'UPI'}
                </Text>
              </View>
            )}
          </View>

          {/* Savings Information */}
          {(payment.interest_saved > 0 || payment.late_fee_prevented > 0) && (
            <View style={styles.savingsSection}>
              <Text style={styles.savingsTitle}>💰 You Saved This Month!</Text>
              <View style={styles.savingsDetails}>
                {payment.interest_saved > 0 && (
                  <View style={styles.savingsRow}>
                    <Text style={styles.savingsLabel}>Interest Saved:</Text>
                    <Text style={[styles.savingsValue, { color: colors.success }]}>
                      ₹{formatAmount(payment.interest_saved)}
                    </Text>
                  </View>
                )}
                {payment.late_fee_prevented > 0 && (
                  <View style={styles.savingsRow}>
                    <Text style={styles.savingsLabel}>Late Fees Prevented:</Text>
                    <Text style={[styles.savingsValue, { color: colors.success }]}>
                      ₹{formatAmount(payment.late_fee_prevented)}
                    </Text>
                  </View>
                )}
                <View style={styles.savingsRow}>
                  <Text style={styles.savingsLabel}>Total Savings:</Text>
                    <Text style={[styles.savingsValue, { color: colors.success }]}>
                      ₹{formatAmount((payment.interest_saved || 0) + (payment.late_fee_prevented || 0))}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          )}

          {/* Actions */}
          <View style={styles.actionsSection}>
            {payment.status === 'failed' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={onRetry}
              >
                <Icon name="refresh" size={20} color="#FFFFFF" style={styles.actionIcon} />
                <Text style={styles.actionText}>Retry Payment</Text>
              </TouchableOpacity>
            )}

            {payment.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning }]}
                onPress={onCancel}
              >
                <Icon name="close" size={20} color="#FFFFFF" style={styles.actionIcon} />
                <Text style={styles.actionText}>Cancel Payment</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={onDetails}
            >
              <Icon name="information-circle-outline" size={20} color={colors.primary} style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: colors.primary }]}>View Details</Text>
              </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  alertItem: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  alertHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    },
  headerIcon: {
    marginRight: 8,
  },
  expandIcon: {
    marginLeft: 4,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  paymentDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    textAlign: 'right',
  },
  savingsSection: {
    backgroundColor: '#F0F8FF',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0FFE0',
  },
  savingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  savingsDetails: {
    marginBottom: 8,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  savingsLabel: {
    fontSize: 14,
    color: '#2E7D32',
    flex: 1,
  },
  savingsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    textAlign: 'right',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#FFFFFF',
  },
  actionIcon: {
    marginRight: 4,
  },
});

export default React.memo(PaymentAlertItem);