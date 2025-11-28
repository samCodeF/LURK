/**
 * Premium Slice - Subscription Management State
 * Handles premium features, subscriptions, billing, and AI assistant
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Import services
import { ApiService } from '../../services/ApiService';

// Initial state
const initialState = {
  subscription: {
    tier: 'free', // free, silver, gold, platinum
    status: 'active', // active, expired, cancelled, trialing
    renews_at: null,
    cancel_at_period_end: false,
    trial_end: null,
    current_period_start: null,
    current_period_end: null,
    next_billing_amount: 0,
    next_billing_currency: 'INR',
  },
  features: {
    // Free tier features
    basic_automation: true,
    single_card_support: true,
    basic_analytics: true,
    email_support: false,

    // Silver tier features
    multiple_card_support: false,
    advanced_analytics: false,
    payment_scheduling: false,
    priority_support: false,

    // Gold tier features
    ai_insights: false,
    custom_payment_rules: false,
    api_access: false,
    early_payment_reminders: false,

    // Platinum tier features
    dedicated_support: false,
    custom_integrations: false,
    advanced_reports: false,
    white_labeling: false,
  },
  billing: {
    payment_methods: [],
    invoices: [],
    upcoming_invoices: [],
    billing_history: [],
    usage_stats: {
      payments_processed: 0,
      interest_saved: 0,
      cards_automated: 0,
      api_calls: 0,
    },
  },
  usage: {
    payments_this_month: 0,
    cards_connected: 0,
    automations_active: 0,
    storage_used: 0,
    api_calls_this_month: 0,
  },
  limits: {
    free_tier: {
      max_cards: 1,
      max_payments_per_month: 5,
      max_automations: 1,
      max_storage_mb: 100,
      max_api_calls: 0,
    },
    silver_tier: {
      max_cards: 5,
      max_payments_per_month: 50,
      max_automations: 5,
      max_storage_mb: 500,
      max_api_calls: 1000,
    },
    gold_tier: {
      max_cards: 20,
      max_payments_per_month: 200,
      max_automations: 20,
      max_storage_mb: 2000,
      max_api_calls: 10000,
    },
    platinum_tier: {
      max_cards: -1, // unlimited
      max_payments_per_month: -1, // unlimited
      max_automations: -1, // unlimited
      max_storage_mb: -1, // unlimited
      max_api_calls: -1, // unlimited
    },
  },
  pricing: {
    silver: {
      monthly: 199,
      yearly: 1990,
      currency: 'INR',
      features: [
        'Up to 5 credit cards',
        '50 automated payments/month',
        'Advanced analytics',
        'Payment scheduling',
        'Priority email support',
      ],
    },
    gold: {
      monthly: 499,
      yearly: 4990,
      currency: 'INR',
      features: [
        'Up to 20 credit cards',
        '200 automated payments/month',
        'AI-powered insights',
        'Custom payment rules',
        'API access',
        'Early payment reminders',
      ],
    },
    platinum: {
      monthly: 999,
      yearly: 9990,
      currency: 'INR',
      features: [
        'Unlimited credit cards',
        'Unlimited automated payments',
        'Dedicated support manager',
        'Custom integrations',
        'Advanced reporting',
        'White labeling options',
      ],
    },
  },
  promotions: [],
  available_upgrades: [],
  payment_method: null,
  loading: false,
  error: null,
  subscriptionLoading: false,
  billingLoading: false,
};

// Async thunks
export const fetchSubscription = createAsyncThunk(
  'premium/fetchSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/premium/subscription');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription');
    }
  }
);

export const upgradeSubscription = createAsyncThunk(
  'premium/upgradeSubscription',
  async ({ tier, billingCycle = 'monthly', paymentMethodId }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/premium/upgrade', {
        tier,
        billing_cycle: billingCycle,
        payment_method_id: paymentMethodId,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upgrade subscription');
    }
  }
);

export const downgradeSubscription = createAsyncThunk(
  'premium/downgradeSubscription',
  async ({ tier, effectiveDate = 'period_end' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.put('/premium/downgrade', {
        tier,
        effective_date: effectiveDate,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to downgrade subscription');
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'premium/cancelSubscription',
  async ({ cancelAtPeriodEnd = true, reason = '', feedback = '' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/premium/cancel', {
        cancel_at_period_end: cancelAtPeriodEnd,
        reason,
        feedback,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel subscription');
    }
  }
);

export const reactivateSubscription = createAsyncThunk(
  'premium/reactivateSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/premium/reactivate');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reactivate subscription');
    }
  }
);

export const fetchBillingHistory = createAsyncThunk(
  'premium/fetchBillingHistory',
  async ({ page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/premium/billing/history', {
        page,
        limit,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch billing history');
    }
  }
);

export const fetchPaymentMethods = createAsyncThunk(
  'premium/fetchPaymentMethods',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/premium/payment-methods');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment methods');
    }
  }
);

export const addPaymentMethod = createAsyncThunk(
  'premium/addPaymentMethod',
  async ({ paymentMethodData }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/premium/payment-methods', paymentMethodData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add payment method');
    }
  }
);

export const removePaymentMethod = createAsyncThunk(
  'premium/removePaymentMethod',
  async ({ paymentMethodId }, { rejectWithValue }) => {
    try {
      const response = await ApiService.delete(`/premium/payment-methods/${paymentMethodId}`);
      return { paymentMethodId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove payment method');
    }
  }
);

export const updateDefaultPaymentMethod = createAsyncThunk(
  'premium/updateDefaultPaymentMethod',
  async ({ paymentMethodId }, { rejectWithValue }) => {
    try {
      const response = await ApiService.put(`/premium/payment-methods/${paymentMethodId}/default`);
      return { paymentMethodId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update default payment method');
    }
  }
);

export const fetchUsage = createAsyncThunk(
  'premium/fetchUsage',
  async ({ period = 'current_month' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/premium/usage', { period });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch usage');
    }
  }
);

export const fetchPromotions = createAsyncThunk(
  'premium/fetchPromotions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/premium/promotions');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch promotions');
    }
  }
);

export const applyPromoCode = createAsyncThunk(
  'premium/applyPromoCode',
  async ({ code }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/premium/promo-code/apply', { code });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to apply promo code');
    }
  }
);

export const requestRefund = createAsyncThunk(
  'premium/requestRefund',
  async ({ invoiceId, reason, details }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/premium/refund/request', {
        invoice_id: invoiceId,
        reason,
        details,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to request refund');
    }
  }
);

// AI Assistant specific thunks
export const getAIInsights = createAsyncThunk(
  'premium/getAIInsights',
  async ({ type = 'all', limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/premium/ai/insights', {
        type,
        limit,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch AI insights');
    }
  }
);

export const generateAIPaymentSuggestion = createAsyncThunk(
  'premium/generateAIPaymentSuggestion',
  async ({ cardId, context = {} }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/premium/ai/payment-suggestion', {
        card_id: cardId,
        context,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate AI suggestion');
    }
  }
);

export const chatWithAI = createAsyncThunk(
  'premium/chatWithAI',
  async ({ message, conversationId = null }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/premium/ai/chat', {
        message,
        conversation_id: conversationId,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to chat with AI');
    }
  }
);

export const getAIRecommendations = createAsyncThunk(
  'premium/getAIRecommendations',
  async ({ category = 'all' }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/premium/ai/recommendations', {
        category,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch AI recommendations');
    }
  }
);

// Custom rules thunks
export const fetchCustomRules = createAsyncThunk(
  'premium/fetchCustomRules',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/premium/custom-rules');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch custom rules');
    }
  }
);

export const createCustomRule = createAsyncThunk(
  'premium/createCustomRule',
  async ({ ruleData }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/premium/custom-rules', ruleData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create custom rule');
    }
  }
);

export const updateCustomRule = createAsyncThunk(
  'premium/updateCustomRule',
  async ({ ruleId, ruleData }, { rejectWithValue }) => {
    try {
      const response = await ApiService.put(`/premium/custom-rules/${ruleId}`, ruleData);
      return { ruleId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update custom rule');
    }
  }
);

export const deleteCustomRule = createAsyncThunk(
  'premium/deleteCustomRule',
  async ({ ruleId }, { rejectWithValue }) => {
    try {
      const response = await ApiService.delete(`/premium/custom-rules/${ruleId}`);
      return { ruleId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete custom rule');
    }
  }
);

export const testCustomRule = createAsyncThunk(
  'premium/testCustomRule',
  async ({ ruleId, testData }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post(`/premium/custom-rules/${ruleId}/test`, testData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to test custom rule');
    }
  }
);

// Create slice
const premiumSlice = createSlice({
  name: 'premium',
  initialState,
  reducers: {
    // Update subscription locally
    updateSubscription: (state, action) => {
      state.subscription = { ...state.subscription, ...action.payload };
    },

    // Update features locally
    updateFeatures: (state, action) => {
      state.features = { ...state.features, ...action.payload };
    },

    // Update usage locally
    updateUsage: (state, action) => {
      state.usage = { ...state.usage, ...action.payload };
    },

    // Set payment method
    setPaymentMethod: (state, action) => {
      state.payment_method = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set loading states
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setSubscriptionLoading: (state, action) => {
      state.subscriptionLoading = action.payload;
    },

    setBillingLoading: (state, action) => {
      state.billingLoading = action.payload;
    },

    // Reset state
    resetPremiumState: (state) => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    // Fetch subscription
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.subscription = action.payload.subscription || initialState.subscription;
        state.features = action.payload.features || initialState.features;
        state.error = null;
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Upgrade subscription
    builder
      .addCase(upgradeSubscription.pending, (state) => {
        state.subscriptionLoading = true;
        state.error = null;
      })
      .addCase(upgradeSubscription.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.subscription = action.payload.subscription || state.subscription;
        state.features = action.payload.features || state.features;
        state.error = null;
      })
      .addCase(upgradeSubscription.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.error = action.payload;
      });

    // Downgrade subscription
    builder
      .addCase(downgradeSubscription.pending, (state) => {
        state.subscriptionLoading = true;
        state.error = null;
      })
      .addCase(downgradeSubscription.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        // Note: Downgrade takes effect at period end, so subscription stays current
        state.error = null;
      })
      .addCase(downgradeSubscription.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.error = action.payload;
      });

    // Cancel subscription
    builder
      .addCase(cancelSubscription.pending, (state) => {
        state.subscriptionLoading = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.subscription.cancel_at_period_end = action.payload.cancel_at_period_end;
        state.error = null;
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.error = action.payload;
      });

    // Reactivate subscription
    builder
      .addCase(reactivateSubscription.pending, (state) => {
        state.subscriptionLoading = true;
        state.error = null;
      })
      .addCase(reactivateSubscription.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.subscription = action.payload.subscription || state.subscription;
        state.subscription.cancel_at_period_end = false;
        state.error = null;
      })
      .addCase(reactivateSubscription.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.error = action.payload;
      });

    // Fetch billing history
    builder
      .addCase(fetchBillingHistory.pending, (state) => {
        state.billingLoading = true;
        state.error = null;
      })
      .addCase(fetchBillingHistory.fulfilled, (state, action) => {
        state.billingLoading = false;
        state.billing.invoices = action.payload.invoices || [];
        state.billing.billing_history = action.payload.billing_history || [];
        state.error = null;
      })
      .addCase(fetchBillingHistory.rejected, (state, action) => {
        state.billingLoading = false;
        state.error = action.payload;
      });

    // Fetch payment methods
    builder
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.loading = false;
        state.billing.payment_methods = action.payload.payment_methods || [];
        state.error = null;
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Add payment method
    builder
      .addCase(addPaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.loading = false;
        state.billing.payment_methods.push(action.payload);
        state.error = null;
      })
      .addCase(addPaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Remove payment method
    builder
      .addCase(removePaymentMethod.fulfilled, (state, action) => {
        state.billing.payment_methods = state.billing.payment_methods.filter(
          method => method.id !== action.payload.paymentMethodId
        );
        state.error = null;
      })
      .addCase(removePaymentMethod.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Update default payment method
    builder
      .addCase(updateDefaultPaymentMethod.fulfilled, (state, action) => {
        state.billing.payment_methods = state.billing.payment_methods.map(method =>
          method.id === action.payload.paymentMethodId
            ? { ...method, is_default: true }
            : { ...method, is_default: false }
        );
        state.error = null;
      })
      .addCase(updateDefaultPaymentMethod.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Fetch usage
    builder
      .addCase(fetchUsage.fulfilled, (state, action) => {
        state.usage = action.payload.usage || initialState.usage;
        state.billing.usage_stats = action.payload.usage_stats || initialState.billing.usage_stats;
      })
      .addCase(fetchUsage.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Fetch promotions
    builder
      .addCase(fetchPromotions.fulfilled, (state, action) => {
        state.promotions = action.payload.promotions || [];
        state.available_upgrades = action.payload.available_upgrades || [];
      })
      .addCase(fetchPromotions.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Apply promo code
    builder
      .addCase(applyPromoCode.fulfilled, (state, action) => {
        state.subscription = action.payload.subscription || state.subscription;
        state.pricing = action.payload.pricing || state.pricing;
      })
      .addCase(applyPromoCode.rejected, (state, action) => {
        state.error = action.payload;
      });

    // AI Insights
    builder
      .addCase(getAIInsights.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAIInsights.fulfilled, (state, action) => {
        state.loading = false;
        // AI insights would be stored in a separate array if needed
        state.error = null;
      })
      .addCase(getAIInsights.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Handle rehydration
    builder
      .addCase('persist/REHYDRATE', (state, action) => {
        // Rehydrate persisted state
        return {
          ...state,
          subscription: action.payload?.subscription || initialState.subscription,
          features: action.payload?.features || initialState.features,
          usage: action.payload?.usage || initialState.usage,
          billing: action.payload?.billing || initialState.billing,
        };
      });
  },
});

// Export actions and selectors
export const {
  updateSubscription,
  updateFeatures,
  updateUsage,
  setPaymentMethod,
  clearError,
  setLoading,
  setSubscriptionLoading,
  setBillingLoading,
  resetPremiumState,
} = premiumSlice.actions;

// Selectors
export const selectSubscription = (state) => state.premium.subscription;
export const selectSubscriptionTier = (state) => state.premium.subscription.tier;
export const selectSubscriptionStatus = (state) => state.premium.subscription.status;
export const selectFeatures = (state) => state.premium.features;
export const selectBilling = (state) => state.premium.billing;
export const selectUsage = (state) => state.premium.usage;
export const selectPricing = (state) => state.premium.pricing;
export const selectPromotions = (state) => state.premium.promotions;
export const selectPaymentMethods = (state) => state.premium.billing.payment_methods;
export const selectUsageStats = (state) => state.premium.billing.usage_stats;
export const selectPremiumLoading = (state) => state.premium.loading;
export const selectSubscriptionLoading = (state) => state.premium.subscriptionLoading;
export const selectBillingLoading = (state) => state.premium.billingLoading;
export const selectPremiumError = (state) => state.premium.error;

// Feature check selectors
export const hasFeature = (state, feature) => !!state.premium.features[feature];
export const isPremiumTier = (state) => state.premium.subscription.tier !== 'free';
export const isSilverTier = (state) => state.premium.subscription.tier === 'silver';
export const isGoldTier = (state) => state.premium.subscription.tier === 'gold';
export const isPlatinumTier = (state) => state.premium.subscription.tier === 'platinum';
export const hasAIFeatures = (state) => isGoldTier(state) || isPlatinumTier(state);
export const hasCustomRules = (state) => isGoldTier(state) || isPlatinumTier(state);
export const hasAPIAccess = (state) => isGoldTier(state) || isPlatinumTier(state);

// Usage limit selectors
export const getUsageLimit = (state, metric) => {
  const tier = state.premium.subscription.tier;
  const limits = state.premium.limits[`${tier}_tier`];
  return limits ? limits[metric] : 0;
};

export const getUsagePercentage = (state, metric) => {
  const used = state.premium.usage[metric] || 0;
  const limit = getUsageLimit(state, metric);
  return limit <= 0 ? 0 : (used / limit) * 100;
};

export const isNearUsageLimit = (state, metric, threshold = 80) => {
  return getUsagePercentage(state, metric) >= threshold;
};

export default premiumSlice.reducer;