/**
 * API Service - Central API Communication for Lurk App
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import device info for debugging
import { DeviceInfo } from '../utils/DeviceInfo';

class ApiService {
  constructor() {
    this.baseURL = __DEV__
      ? 'http://localhost:8000/api'
      : 'https://api.lurk.app/api';

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  setupInterceptors() {
    // This would be implemented with axios or similar
    // For now, we'll handle token management manually
  }

  /**
   * Get current authentication headers
   */
  async getAuthHeaders() {
    try {
      const tokens = await AsyncStorage.getItem('@lurk_tokens');
      if (tokens) {
        const { accessToken } = JSON.parse(tokens);
        if (accessToken) {
          return {
            ...this.defaultHeaders,
            'Authorization': `Bearer ${accessToken}`,
          };
        }
      }
    } catch (error) {
      console.error('Error getting auth headers:', error);
    }

    return this.defaultHeaders;
  }

  /**
   * Generic API request method
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      headers = {},
      timeout = 30000, // 30 seconds
    } = options;

    try {
      const url = `${this.baseURL}${endpoint}`;
      const authHeaders = await this.getAuthHeaders();
      const requestHeaders = { ...authHeaders, ...headers };

      // Add device info for debugging
      const deviceInfo = await DeviceInfo.getInfo();
      const platformInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        ...deviceInfo,
      };

      const fetchOptions = {
        method,
        headers: requestHeaders,
        timeout,
        body: data ? JSON.stringify(data) : null,
      };

      const response = await fetch(url, fetchOptions);

      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        await this.handleTokenRefresh();
        // Retry with new token
        const newHeaders = await this.getAuthHeaders();
        const retryOptions = {
          ...fetchOptions,
          headers: { ...newHeaders, ...headers },
        };
        return fetch(url, retryOptions);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(responseText);
      } catch {
        return responseText;
      }
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Handle token refresh
   */
  async handleTokenRefresh() {
    try {
      const tokens = await AsyncStorage.getItem('@lurk_tokens');
      if (tokens) {
        const { refreshToken } = JSON.parse(tokens);
        if (refreshToken) {
          // Call refresh endpoint
          const response = await this.request('/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshToken}`,
            },
          });

          if (response.access_token) {
            await AsyncStorage.setItem('@lurk_tokens', JSON.stringify({
              accessToken: response.access_token,
              refreshToken: response.refresh_token,
            }));
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }

    // Clear tokens and trigger re-authentication
    await AsyncStorage.removeItem('@lurk_tokens');
    this.emit('authError', { message: 'Authentication required' });
    return false;
  }

  /**
   * Event emitter for auth errors
   */
  emit(event, data) {
    // This would be implemented with an event emitter
    // For now, we'll store error state
    this.emit('authError', data);
  }

  /**
   * Subscribe to auth errors
   */
  onAuthError(callback) {
    // This would return an unsubscribe function
    // For now, we'll store callback in a simple array
    if (!this.authErrorCallbacks) {
      this.authErrorCallbacks = [];
    }
    this.authErrorCallbacks.push(callback);

    return () => {
      if (this.authErrorCallbacks) {
        const index = this.authErrorCallbacks.indexOf(callback);
        if (index > -1) {
          this.authErrorCallbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * HTTP Methods
   */
  async get(endpoint, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET', ...options });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { method: 'POST', data, ...options });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { method: 'PUT', data, ...options });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  async patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { method: 'PATCH', data, ...options });
  }

  /**
   * Authentication endpoints
   */
  async login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  async register(userData) {
    return this.post('/auth/register', userData);
  }

  async logout() {
    const response = await this.post('/auth/logout');
    // Clear local tokens regardless of API response
    await AsyncStorage.removeItem('@lurk_tokens');
    return response;
  }

  async refreshToken() {
    const tokens = await AsyncStorage.getItem('@lurk_tokens');
    if (tokens) {
      const { refreshToken } = JSON.parse(tokens);
      return this.post('/auth/refresh', { refresh_token: refreshToken });
    }
    throw new Error('No refresh token available');
  }

  async verifyKyc(aadhaarNumber, otp) {
    return this.post('/auth/kyc/verify', {
      aadhaar_number: aadhaarNumber,
      otp: otp,
    });
  }

  async sendKycOtp(aadhaarNumber) {
    return this.post('/auth/kyc/send-otp', {
      aadhaar_number: aadhaarNumber,
    });
  }

  async setupBiometric(biometricData) {
    return this.post('/auth/biometric/setup', biometricData);
  }

  async verifyBiometric(challengeResponse, deviceData) {
    return this.post('/auth/biometric/verify', {
      challenge_response: challengeResponse,
      device_data: deviceData,
    });
  }

  async removeBiometric() {
    return this.delete('/auth/biometric/remove');
  }

  /**
   * Credit card endpoints
   */
  async getCards() {
    return this.get('/cards');
  }

  async getCard(cardId) {
    return this.get(`/cards/${cardId}`);
  }

  async addCard(cardData) {
    return this.post('/cards', cardData);
  }

  async updateCard(cardId, cardData) {
    return this.put(`/cards/${cardId}`, cardData);
  }

  async deleteCard(cardId) {
    return this.delete(`/cards/${cardId}`);
  }

  async syncCard(cardId) {
    return this.post(`/cards/${cardId}/sync`);
  }

  async getCardStatement(cardId, month = null, year = null) {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;

    return this.get(`/cards/${cardId}/statement`, params);
  }

  async getCardBalance(cardId) {
    return this.get(`/cards/${cardId}/balance`);
  }

  async enableCardAutomation(cardId, paymentPreference, customAmount, bufferHours) {
    return this.post(`/cards/${cardId}/enable-automation`, {
      payment_preference: paymentPreference,
      custom_amount: customAmount,
      buffer_hours: bufferHours,
    });
  }

  async disableCardAutomation(cardId) {
    return this.post(`/cards/${cardId}/disable-automation`);
  }

  /**
   * Payment endpoints
   */
  async getUpcomingPayments(cardId = null, hoursAhead = 72) {
    const params = {};
    if (cardId) params.card_id = cardId;
    if (hoursAhead) params.hours_ahead = hoursAhead;

    return this.get('/payments/upcoming', params);
  }

  async getPaymentHistory(
    cardId = null,
    paymentType = null,
    status = null,
    startDate = null,
    endDate = null,
    skip = 0,
    limit = 50
  ) {
    const params = {
      skip,
      limit,
    };

    if (cardId) params.card_id = cardId;
    if (paymentType) params.payment_type = paymentType;
    if (status) params.status = status;
    if (startDate) params.start_date = startDate.toISOString();
    if (endDate) params.end_date = endDate.toISOString();

    return this.get('/payments/history', params);
  }

  async getPayment(paymentId) {
    return this.get(`/payments/${paymentId}`);
  }

  async createPayment(paymentData) {
    return this.post('/payments', paymentData);
  }

  async updatePayment(paymentId, updateData) {
    return this.put(`/payments/${paymentId}`, updateData);
  }

  async cancelPayment(paymentId) {
    return this.post(`/payments/${paymentId}/cancel`);
  }

  async schedulePayment(scheduleData) {
    return this.post('/payments/schedule', scheduleData);
  }

  async getScheduledPayments(cardId = null) {
    const params = {};
    if (cardId) params.card_id = cardId;

    return this.get('/payments/scheduled', params);
  }

  async cancelScheduledPayment(scheduleId) {
    return this.delete(`/payments/scheduled/${scheduleId}`);
  }

  async getPaymentSummary(cardId = null, months = 6) {
    const params = { months };
    if (cardId) params.card_id = cardId;

    return this.get('/payments/summary', params);
  }

  async getPaymentAnalytics(months = 12, cardId = null) {
    const params = { months };
    if (cardId) params.card_id = cardId;

    return this.get('/payments/analytics', params);
  }

  async getAutomationSettings() {
    return this.get('/payments/automation/settings');
  }

  async updateAutomationSettings(settings) {
    return this.put('/payments/automation/settings', settings);
  }

  async handleWebhook(webhookData, headers) {
    return this.post('/payments/webhook/razorpay', webhookData, {
      headers,
    });
  }

  /**
   * Analytics endpoints
   */
  async getSpendingAnalytics(startDate, endDate, categoryId, cardId = null) {
    const params = {};
    if (startDate) params.start_date = startDate.toISOString();
    if (endDate) params.end_date = endDate.toISOString();
    if (categoryId) params.category = categoryId;
    if (cardId) params.card_id = cardId;

    return this.get('/analytics/spending', params);
  }

  async getMonthlySpending(months = 12, cardId = null) {
    const params = { months };
    if (cardId) params.card_id = cardId;

    return this.get('/analytics/spending/monthly', params);
  }

  async getCategorySpending(startDate, endDate, cardId = null) {
    const params = {};
    if (startDate) params.start_date = startDate.toISOString();
    if (endDate) params.end_date = endDate.toISOString();
    if (cardId) params.card_id = cardId;

    return this.get('/analytics/spending/categories', cardId);
  }

  async getSavingsAnalytics(startDate, endDate, cardId = null) {
    const params = {};
    if (startDate) params.start_date = startDate.toISOString();
    if (endDate) params.end_date = endDate.toISOString();
    if (cardId) params.card_id = cardId;

    return this.get('/analytics/savings', cardId);
  }

  async getSavingsSummary() {
    return this.get('/analytics/savings/summary');
  }

  async getSavingsForecast(months = 6) {
    return this.get('/analytics/savings/forecast', { months });
  }

  async getCreditScoreAnalysis() {
    return this.get('/analytics/credit-score');
  }

  async getCreditRecommendations() {
    return this.get('/analytics/credit-score/recommendations');
  }

  async getFinancialInsights() {
    return this.get('/analytics/insights');
  }

  async getAnalyticsDashboard() {
    return this.get('/analytics/dashboard');
  }

  async exportSpendingData(format = 'csv', startDate, endDate, categoryId) {
    const params = { format };
    if (startDate) params.start_date = startDate.toISOString();
    if (endDate) params.end_date = endDate.toISOString();
    if (categoryId) params.category = categoryId;

    return this.get('/analytics/export/spending', params);
  }

  /**
   * Premium endpoints
   */
  async getSubscriptionStatus() {
    return this.get('/premium/subscription');
  }

  async upgradeSubscription(tier, paymentMethodId) {
    return this.post('/premium/upgrade', {
      tier,
      payment_method_id: paymentMethodId,
    });
  }

  async downgradeSubscription(tier) {
    return this.post('/premium/downgrade', {
      tier,
    });
  }

  async cancelSubscription(reason) {
    return this.post('/premium/cancel', {
      reason,
    });
  }

  async getPricingPlans() {
    return this.get('/premium/pricing');
  }

  async getAiAssistantInsights() {
    return this.get('/premium/ai-assistant');
  }

  async getExclusiveOffers() {
    return this.get('/premium/exclusive-offers');
  }

  async getEnhancedAnalytics(months = 12) {
    return this.get('/premium/enhanced-analytics', { months });
  }

  async updateFeatureFlags(featureFlags) {
    return this.post('/premium/feature-flags', {
      feature_flags,
    });
  }

  async getBillingHistory(limit = 12) {
    return this.get('/premium/billing/history', { limit });
  }

  async getPaymentMethods() {
    return this.get('/premium/payment-methods');
  }

  async addPaymentMethod(paymentMethodToken, setAsDefault = false) {
    return this.post('/premium/payment-methods', {
      payment_method_token: paymentMethodToken,
      set_as_default: setAsDefault,
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.get('/health');
  }

  /**
   * Error handling
   */
  handleApiError(error) {
    console.error('API Error:', error);

    if (error.status === 401) {
      // Token expired or invalid
      this.emit('authError', { message: 'Authentication required' });
    } else if (error.status === 403) {
      // Subscription required
      this.emit('premiumRequired', { message: 'Premium subscription required' });
    } else if (error.status >= 500) {
      // Server error
      this.emit('serverError', { message: 'Server error occurred' });
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;