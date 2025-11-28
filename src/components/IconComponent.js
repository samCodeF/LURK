/**
 * Icon Component - Demonstrates Vector Icons 6.4.18 usage
 * Centralized icon management for the Lurk app
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Ionicons from 'react-native-vector-icons/Ionicons';

const IconComponent = ({
  name,
  type = 'MaterialIcons',
  size = 24,
  color = '#333',
  onPress,
  style,
  disabled = false,
  ...props
}) => {
  const renderIcon = () => {
    const iconProps = {
      name,
      size,
      color: disabled ? '#ccc' : color,
      ...props,
    };

    switch (type) {
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons {...iconProps} />;
      case 'FontAwesome5':
        return <FontAwesome5 {...iconProps} />;
      case 'FontAwesome6':
        return <FontAwesome6 {...iconProps} />;
      case 'Ionicons':
        return <Ionicons {...iconProps} />;
      case 'MaterialIcons':
      default:
        return <Icon {...iconProps} />;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.touchable, style]}
        disabled={disabled}
        activeOpacity={0.6}
      >
        {renderIcon()}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {renderIcon()}
    </View>
  );
};

// Icon presets for common Lurk app icons
export const AppIcons = {
  // Navigation
  home: { name: 'home', type: 'MaterialIcons' },
  creditCard: { name: 'credit-card', type: 'FontAwesome5' },
  analytics: { name: 'analytics', type: 'MaterialIcons' },
  settings: { name: 'settings', type: 'MaterialIcons' },
  notifications: { name: 'notifications', type: 'MaterialIcons' },
  profile: { name: 'person', type: 'MaterialIcons' },

  // Credit Card Actions
  addCard: { name: 'add-card', type: 'MaterialCommunityIcons' },
  autoPay: { name: 'autorenew', type: 'MaterialIcons' },
  payment: { name: 'payment', type: 'MaterialIcons' },
  security: { name: 'security', type: 'MaterialIcons' },
  shield: { name: 'shield-check', type: 'MaterialCommunityIcons' },

  // Status Icons
  success: { name: 'check-circle', type: 'MaterialIcons' },
  error: { name: 'error', type: 'MaterialIcons' },
  warning: { name: 'warning', type: 'MaterialIcons' },
  info: { name: 'info', type: 'MaterialIcons' },

  // Financial Icons
  rupee: { name: 'currency-rupee', type: 'MaterialCommunityIcons' },
  savings: { name: 'savings', type: 'MaterialIcons' },
  trendingUp: { name: 'trending-up', type: 'MaterialIcons' },
  trendingDown: { name: 'trending-down', type: 'MaterialIcons' },

  // Bank Icons
  bank: { name: 'bank', type: 'MaterialCommunityIcons' },
  hdfc: { name: 'bank-outline', type: 'MaterialCommunityIcons' },
  icici: { name: 'bank', type: 'MaterialCommunityIcons' },
  sbi: { name: 'bank-transfer', type: 'MaterialCommunityIcons' },
  axis: { name: 'bank-check', type: 'MaterialCommunityIcons' },

  // Actions
  edit: { name: 'edit', type: 'MaterialIcons' },
  delete: { name: 'delete', type: 'MaterialIcons' },
  save: { name: 'save', type: 'MaterialIcons' },
  cancel: { name: 'cancel', type: 'MaterialIcons' },
  refresh: { name: 'refresh', type: 'MaterialIcons' },

  // Social Features
  share: { name: 'share', type: 'MaterialIcons' },
  invite: { name: 'person-add', type: 'MaterialIcons' },
  reward: { name: 'trophy', type: 'MaterialIcons' },
  star: { name: 'star', type: 'MaterialIcons' },
  heart: { name: 'heart', type: 'FontAwesome5' },

  // Security & Biometric
  fingerprint: { name: 'fingerprint', type: 'MaterialIcons' },
  faceId: { name: 'face', type: 'MaterialIcons' },
  lock: { name: 'lock', type: 'MaterialIcons' },
  unlock: { name: 'lock-open', type: 'MaterialIcons' },

  // App Features
  ghostMode: { name: 'ghost', type: 'MaterialCommunityIcons' },
  ninja: { name: 'ninja', type: 'MaterialCommunityIcons' },
  lightning: { name: 'flash-on', type: 'MaterialIcons' },
  fire: { name: 'fire', type: 'FontAwesome5' },

  // Payment Methods
  upi: { name: 'cellphone-wallet', type: 'MaterialCommunityIcons' },
  cardPayment: { name: 'credit-card', type: 'FontAwesome5' },
  netBanking: { name: 'bank-transfer', type: 'MaterialCommunityIcons' },
  wallet: { name: 'wallet', type: 'MaterialIcons' },

  // Verification
  verified: { name: 'verified', type: 'MaterialIcons' },
  checkCircle: { name: 'check-circle', type: 'MaterialIcons' },
  closeCircle: { name: 'close-circle', type: 'MaterialIcons' },

  // UI Icons
  eye: { name: 'eye', type: 'MaterialIcons' },
  eyeOff: { name: 'eye-off', type: 'MaterialIcons' },
  expandMore: { name: 'expand-more', type: 'MaterialIcons' },
  expandLess: { name: 'expand-less', type: 'MaterialIcons' },
  menu: { name: 'menu', type: 'MaterialIcons' },
  close: { name: 'close', type: 'MaterialIcons' },
  back: { name: 'arrow-back', type: 'MaterialIcons' },
  forward: { name: 'arrow-forward', type: 'MaterialIcons' },

  // Premium Features
  crown: { name: 'crown', type: 'MaterialCommunityIcons' },
  diamond: { name: 'diamond', type: 'FontAwesome6' },
  premium: { name: 'star-circle', type: 'MaterialCommunityIcons' },
  vip: { name: 'vip', type: 'MaterialCommunityIcons' },
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 4,
  },
});

export default IconComponent;
export { Icon };