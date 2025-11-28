/**
 * Icon Constants for Lurk App
 * Centralized icon definitions using Vector Icons 6.4.18
 */

import { AppIcons } from '../components/IconComponent';

// Navigation Icons
export const NavigationIcons = {
  home: { ...AppIcons.home, size: 24 },
  cards: { ...AppIcons.creditCard, size: 24 },
  analytics: { ...AppIcons.analytics, size: 24 },
  profile: { ...AppIcons.profile, size: 24 },
  settings: { ...AppIcons.settings, size: 24 },
};

// Tab Bar Icons
export const TabBarIcons = {
  home: { ...AppIcons.home, size: 26 },
  cards: { ...AppIcons.creditCard, size: 26 },
  analytics: { ...AppIcons.analytics, size: 26 },
  profile: { ...AppIcons.profile, size: 26 },
  settings: { ...AppIcons.settings, size: 26 },
};

// Header Icons
export const HeaderIcons = {
  notifications: { ...AppIcons.notifications, size: 24 },
  help: { name: 'help', type: 'MaterialIcons', size: 24 },
  logout: { name: 'logout', type: 'MaterialIcons', size: 24 },
  add: { name: 'add', type: 'MaterialIcons', size: 24 },
  search: { name: 'search', type: 'MaterialIcons', size: 24 },
  filter: { name: 'filter-list', type: 'MaterialIcons', size: 24 },
};

// Credit Card Icons
export const CreditCardIcons = {
  add: { ...AppIcons.addCard, size: 32 },
  edit: { ...AppIcons.edit, size: 24 },
  delete: { ...AppIcons.delete, size: 24 },
  save: { ...AppIcons.save, size: 24 },
  autoPay: { ...AppIcons.autoPay, size: 24 },
  payment: { ...AppIcons.payment, size: 24 },
  security: { ...AppIcons.security, size: 24 },
  verified: { ...AppIcons.verified, size: 20 },
  bank: { ...AppIcons.bank, size: 24 },
};

// Bank Icons (for major Indian banks)
export const BankIcons = {
  HDFC: { name: 'bank-outline', type: 'MaterialCommunityIcons', size: 32 },
  ICICI: { name: 'bank', type: 'MaterialCommunityIcons', size: 32 },
  SBI: { name: 'bank-transfer', type: 'MaterialCommunityIcons', size: 32 },
  AXIS: { name: 'bank-check', type: 'MaterialCommunityIcons', size: 32 },
  KOTAK: { name: 'bank-plus', type: 'MaterialCommunityIcons', size: 32 },
  YES: { name: 'bank-minus', type: 'MaterialCommunityIcons', size: 32 },
  PNB: { name: 'bank-marker', type: 'MaterialCommunityIcons', size: 32 },
  IDFC: { name: 'bank-transfer-out', type: 'MaterialCommunityIcons', size: 32 },
  RBL: { name: 'bank-transfer-in', type: 'MaterialCommunityIcons', size: 32 },
  IDBI: { name: 'bank-off', type: 'MaterialCommunityIcons', size: 32 },
  CITI: { name: 'bank-off-outline', type: 'MaterialCommunityIcons', size: 32 },
  HSBC: { name: 'bank-off-sharp', type: 'MaterialCommunityIcons', size: 32 },
  STANDARD: { name: 'bank-off', type: 'MaterialCommunityIcons', size: 32 },
  AMEX: { name: 'credit-card-marker', type: 'MaterialCommunityIcons', size: 32 },
};

// Status Icons
export const StatusIcons = {
  success: { ...AppIcons.success, color: '#4CAF50' },
  error: { ...AppIcons.error, color: '#F44336' },
  warning: { ...AppIcons.warning, color: '#FF9800' },
  info: { ...AppIcons.info, color: '#2196F3' },
  pending: { name: 'pending', type: 'MaterialIcons', color: '#FF9800', size: 24 },
  processing: { name: 'hourglass-empty', type: 'MaterialIcons', color: '#2196F3', size: 24 },
  completed: { name: 'check-circle', type: 'MaterialIcons', color: '#4CAF50', size: 24 },
  failed: { name: 'cancel', type: 'MaterialIcons', color: '#F44336', size: 24 },
};

// Financial Icons
export const FinancialIcons = {
  rupee: { ...AppIcons.rupee, size: 20 },
  savings: { ...AppIcons.savings, size: 24 },
  trendingUp: { ...AppIcons.trendingUp, color: '#4CAF50' },
  trendingDown: { ...AppIcons.trendingDown, color: '#F44336' },
  wallet: { ...AppIcons.wallet, size: 24 },
  chart: { name: 'bar-chart', type: 'MaterialIcons', size: 24 },
  pieChart: { name: 'pie-chart', type: 'MaterialIcons', size: 24 },
  lineChart: { name: 'show-chart', type: 'MaterialIcons', size: 24 },
  profit: { name: 'trending-up', type: 'MaterialIcons', size: 24, color: '#4CAF50' },
  loss: { name: 'trending-down', type: 'MaterialIcons', size: 24, color: '#F44336' },
};

// Payment Method Icons
export const PaymentIcons = {
  upi: { ...AppIcons.upi, size: 32 },
  netBanking: { ...AppIcons.netBanking, size: 32 },
  card: { ...AppIcons.cardPayment, size: 32 },
  wallet: { ...AppIcons.wallet, size: 32 },
  cash: { name: 'cash', type: 'FontAwesome5', size: 32 },
  credit: { name: 'credit-card', type: 'FontAwesome5', size: 32 },
  debit: { name: 'credit-card-front', type: 'MaterialCommunityIcons', size: 32 },
};

// Security Icons
export const SecurityIcons = {
  fingerprint: { ...AppIcons.fingerprint, size: 32 },
  faceId: { ...AppIcons.faceId, size: 32 },
  shield: { ...AppIcons.shield, size: 24 },
  lock: { ...AppIcons.lock, size: 24 },
  unlock: { ...AppIcons.unlock, size: 24 },
  key: { name: 'key', type: 'MaterialIcons', size: 24 },
  verifiedUser: { name: 'verified-user', type: 'MaterialIcons', size: 24 },
  security: { name: 'security', type: 'MaterialIcons', size: 24 },
  gppGood: { name: 'gpp-good', type: 'MaterialIcons', size: 24 },
  gppBad: { name: 'gpp-bad', type: 'MaterialIcons', size: 24 },
  gppMaybe: { name: 'gpp-maybe', type: 'MaterialIcons', size: 24 },
};

// Social and Viral Feature Icons
export const SocialIcons = {
  share: { ...AppIcons.share, size: 24 },
  invite: { ...AppIcons.invite, size: 24 },
  reward: { ...AppIcons.reward, size: 24 },
  star: { ...AppIcons.star, size: 24 },
  heart: { ...AppIcons.heart, size: 24 },
  like: { name: 'thumb-up', type: 'MaterialIcons', size: 24 },
  dislike: { name: 'thumb-down', type: 'MaterialIcons', size: 24 },
  comment: { name: 'comment', type: 'MaterialIcons', size: 24 },
  bookmark: { name: 'bookmark', type: 'MaterialIcons', size: 24 },
  bookmarkBorder: { name: 'bookmark-border', type: 'MaterialIcons', size: 24 },
};

// Gamification Icons
export const GamificationIcons = {
  ghostMode: { ...AppIcons.ghostMode, size: 24 },
  ninja: { ...AppIcons.ninja, size: 24 },
  lightning: { ...AppIcons.lightning, size: 24 },
  fire: { ...AppIcons.fire, size: 24 },
  crown: { ...AppIcons.crown, size: 24 },
  diamond: { ...AppIcons.diamond, size: 24 },
  trophy: { name: 'emoji-events', type: 'MaterialIcons', size: 24 },
  medal: { name: 'military-tech', type: 'MaterialIcons', size: 24 },
  ribbon: { name: 'star-rate', type: 'MaterialIcons', size: 24 },
  badge: { name: 'workspace-premium', type: 'MaterialIcons', size: 24 },
  level: { name: 'signal-cellular-alt', type: 'MaterialIcons', size: 24 },
  xp: { name: 'bolt', type: 'FontAwesome5', size: 24 },
};

// Action Icons
export const ActionIcons = {
  edit: { ...AppIcons.edit, size: 24 },
  delete: { ...AppIcons.delete, size: 24 },
  save: { ...AppIcons.save, size: 24 },
  cancel: { ...AppIcons.cancel, size: 24 },
  refresh: { ...AppIcons.refresh, size: 24 },
  upload: { name: 'upload', type: 'MaterialIcons', size: 24 },
  download: { name: 'download', type: 'MaterialIcons', size: 24 },
  sync: { name: 'sync', type: 'MaterialIcons', size: 24 },
  camera: { name: 'camera-alt', type: 'MaterialIcons', size: 24 },
  gallery: { name: 'photo-library', type: 'MaterialIcons', size: 24 },
  document: { name: 'description', type: 'MaterialIcons', size: 24 },
  pdf: { name: 'picture-as-pdf', type: 'MaterialIcons', size: 24 },
};

// UI Icons
export const UIIcons = {
  eye: { ...AppIcons.eye, size: 24 },
  eyeOff: { ...AppIcons.eyeOff, size: 24 },
  expandMore: { ...AppIcons.expandMore, size: 24 },
  expandLess: { ...AppIcons.expandLess, size: 24 },
  menu: { ...AppIcons.menu, size: 24 },
  close: { ...AppIcons.close, size: 24 },
  back: { ...AppIcons.back, size: 24 },
  forward: { ...AppIcons.forward, size: 24 },
  up: { name: 'keyboard-arrow-up', type: 'MaterialIcons', size: 24 },
  down: { name: 'keyboard-arrow-down', type: 'MaterialIcons', size: 24 },
  left: { name: 'keyboard-arrow-left', type: 'MaterialIcons', size: 24 },
  right: { name: 'keyboard-arrow-right', type: 'MaterialIcons', size: 24 },
  drag: { name: 'drag-indicator', type: 'MaterialIcons', size: 24 },
  reorder: { name: 'reorder', type: 'MaterialIcons', size: 24 },
};

// Premium Icons
export const PremiumIcons = {
  crown: { ...AppIcons.crown, size: 24 },
  diamond: { ...AppIcons.diamond, size: 24 },
  premium: { ...AppIcons.premium, size: 24 },
  vip: { ...AppIcons.vip, size: 24 },
  star: { name: 'star', type: 'MaterialIcons', size: 24 },
  gold: { name: 'gold', type: 'FontAwesome6', size: 24 },
  silver: { name: 'coins', type: 'FontAwesome6', size: 24 },
  bronze: { name: 'medal', type: 'FontAwesome6', size: 24 },
  lock: { name: 'lock', type: 'MaterialIcons', size: 24 },
  unlock: { name: 'lock-open', type: 'MaterialIcons', size: 24 },
};

// Settings Icons
export const SettingsIcons = {
  notifications: { ...AppIcons.notifications, size: 24 },
  privacy: { name: 'privacy-tip', type: 'MaterialIcons', size: 24 },
  security: { name: 'security', type: 'MaterialIcons', size: 24 },
  language: { name: 'language', type: 'MaterialIcons', size: 24 },
  help: { name: 'help', type: 'MaterialIcons', size: 24 },
  feedback: { name: 'feedback', type: 'MaterialIcons', size: 24 },
  about: { name: 'info', type: 'MaterialIcons', size: 24 },
  terms: { name: 'description', type: 'MaterialIcons', size: 24 },
  policy: { name: 'policy', type: 'MaterialIcons', size: 24 },
  rate: { name: 'star-rate', type: 'MaterialIcons', size: 24 },
  share: { name: 'share', type: 'MaterialIcons', size: 24 },
  version: { name: 'system-update', type: 'MaterialIcons', size: 24 },
};

// Export all icon sets
export default {
  NavigationIcons,
  TabBarIcons,
  HeaderIcons,
  CreditCardIcons,
  BankIcons,
  StatusIcons,
  FinancialIcons,
  PaymentIcons,
  SecurityIcons,
  SocialIcons,
  GamificationIcons,
  ActionIcons,
  UIIcons,
  PremiumIcons,
  SettingsIcons,
};