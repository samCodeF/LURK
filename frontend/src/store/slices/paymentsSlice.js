/**
 * Payments Slice - Payment Management State
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Import services
import { ApiService } from '../../services/ApiService';

// Initial state
const initialState = {
  upcomingPayments: [],
  paymentHistory: [],
  paymentSummary: {
    total_saved: 0,
    total_fees_prevented: 0,
    total_payments_processed: 0,
    average_monthly_savings: 0,
  },
  payment: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
  },
  filters: {
    search: '',
    status: null,
    payment_type: null,
    card_id: null,
    start_date: null,
    end_date: null,
    skip: 0,
    limit: 20,
  },
  sortBy: 'created_at',
  sortOrder: 'desc',
};

// Async thunks
export const fetchUpcomingPayments = createAsyncThunk(
  'payments/fetchUpcoming',
  async (_, { rejectWithValue }) => {
    try {
      const params = {
        card_id: null, // Get all upcoming payments
        hours_ahead: 72, // 3 days
      };

      const response = await ApiService.get('/payments/upcoming', params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch upcoming payments');
    }
  }
);

export const fetchPaymentHistory = createAsyncThunk(
  'payments/fetchHistory',
  async ({ cardId, page = 1, limit = 20, filters = {} }, { rejectWithValue }) => {
    try {
      const params = {
        card_id,
        page,
        limit,
        ...filters,
      };

      const response = await ApiService.get('/payments/history', params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment history');
    }
  }
);

export const fetchPaymentSummary = createAsyncThunk(
  'payments/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/payments/summary');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment summary');
    }
  }
);

export const createPayment = createAsyncThunk(
  'payments/create',
  async ({ card_id, payment_preference = 'minimum_due', custom_amount = null, }, { rejectWithValue }) => {
    try {
      const paymentData = {
        card_id,
        payment_preference,
        custom_amount,
      };

      const response = await ApiService.post('/payments', paymentData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create payment');
    }
  }
);

export const schedulePayment = createAsyncThunk(
  'payments/schedule',
  async ({ card_id, scheduled_date, scheduled_amount, payment_type = 'automatic' }, { rejectWithValue }) => {
    try {
      const scheduleData = {
        card_id,
        scheduled_date: scheduled_date.toISOString(),
        scheduled_amount,
        payment_type,
      };

      const response = await ApiService.post('/payments/schedule', scheduleData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to schedule payment');
    }
  }
);

export const getPayment = createAsyncThunk(
  'payments/getPayment',
  async (paymentId, { rejectWithValue }) => {
    try {
      const response = await ApiService.get(`/payments/${paymentId}`);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get payment');
    }
  }
);

export const updatePayment = createAsyncThunk(
  'payments/updatePayment',
  async ({ paymentId, updateData }, { rejectWithValue }) => {
    try {
      const response = await ApiService.put(`/payments/${paymentId}`, updateData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update payment');
    }
  }
);

export const cancelPayment = createAsyncThunk(
  'payments/cancelPayment',
  async ({ paymentId }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post(`/payments/${paymentId}/cancel`);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel payment');
    }
  }
);

export const cancelScheduledPayment = createAsyncThunk(
  'payments/cancelScheduled',
  async ({ scheduleId }, { rejectWithValue }) => {
    try {
      const response = await ApiService.delete(`/payments/scheduled/${scheduleId}`);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel scheduled payment');
    }
  }
);

export const getScheduledPayments = createAsyncThunk(
  'payments/getScheduled',
  async ({ cardId }, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/payments/scheduled', cardId ? { card_id } : {});
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get scheduled payments');
    }
  }
);

export const getAutomationSettings = createAsyncThunk(
  'payments/getAutomationSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/payments/automation/settings');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get automation settings');
    }
  }
);

export const updateAutomationSettings = createAsyncThunk(
  'payments/updateAutomationSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await ApiService.put('/payments/automation/settings', settings);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update automation settings');
    }
  }
);

export const handleWebhook = createAsyncThunk(
  'payments/handleWebhook',
  async ({ webhookData, headers }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/payments/webhook/razorpay', webhookData, {
        headers: {
          ...headers,
          'X-Razorpay-Signature': headers['X-Razorpay-Signature'],
        },
      });

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to handle webhook');
    }
  }
);

// Create slice
const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: (builder) => {
    // Fetch upcoming payments
    builder
      .addCase(fetchUpcomingPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUpcomingPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.upcomingPayments = action.payload;
        state.error = null;
      })
      .addCase(fetchUpcomingPayments.rejected, (state, action) => {
        state.loading = false;
        state.upcomingPayments = [];
        state.error = action.payload;
      })

    // Fetch payment history
    builder
      .addCase(fetchPaymentHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentHistory = action.payload.payments || [];
        state.pagination = action.payload.pagination || initialState.pagination;
        state.error = null;
      })
      .addCase(fetchPaymentHistory.rejected, (state, action) => {
        state.loading = false;
        state.paymentHistory = [];
        state.pagination = initialState.pagination;
        state.error = action.payload;
      })

    // Fetch payment summary
    builder
      .addCase(fetchPaymentSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentSummary = action.payload;
        state.error = null;
      })
      .addCase(fetchPaymentSummary.rejected, (state, action) => {
        state.loading = false;
        state.paymentSummary = initialState.paymentSummary;
        state.error = action.payload;
      })

    // Create payment
    builder
      .addCase(createPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.payment = action.payload;
        state.error = null;

        // Add to history and update cards
        if (state.paymentHistory) {
          state.paymentHistory.unshift(action.payload);
        }
        if (state.upcomingPayments) {
          // Remove from upcoming if payment is for an upcoming payment
          state.upcomingPayments = state.upcomingPayments.filter(
            payment => payment.id !== action.payload.id
          );
        }
        }
      })
      .addCase(createPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

    // Schedule payment
    builder
      .addCase(schedulePayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(schedulePayment.fulfilled, (state, action) => {
        state.loading = false;
        if (state.upcomingPayments) {
          // Add to upcoming payments if applicable
          state.upcomingPayments.push({
            ...action.payload,
            status: 'scheduled',
            created_at: new Date().toISOString(),
          });
        }
      })
      .addCase(schedulePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

    // Get payment
    builder
      .addCase(getPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.payment = action.payload;
        state.error = null;
      })
      .addCase(getPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

    // Update payment
    builder
      .addCase(updatePayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePayment.fulfilled, (state, action) => {
        state.loading = false;
        if (state.payment && action.payload.id === state.payment.id) {
          state.payment = { ...state.payment, ...action.payload };
        }
        if (state.paymentHistory) {
          const index = state.paymentHistory.findIndex(p => p.id === action.payload.id);
          if (index !== -1) {
            state.paymentHistory[index] = { ...state.paymentHistory[index], ...action.payload };
          }
        }
        state.error = null;
      })
      .addCase(updatePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

    // Cancel payment
    builder
      .addCase(cancelPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelPayment.fulfilled, (state, action) => {
        state.loading = false;
        if (state.payment && state.payment.id === action.payload.id) {
          state.payment = {
            ...state.payment,
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          };
        }
        if (state.paymentHistory) {
          const index = state.paymentHistory.findIndex(p => p.id === action.payload.id);
          if (index !== -1) {
            state.paymentHistory[index] = { ...state.paymentHistory[index], ...state.payment, status: 'cancelled' };
          }
        }
        state.error = null;
      })
      .addCase(cancelPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

    // Cancel scheduled payment
    builder
      .addCase(cancelScheduledPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelScheduledPayment.fulfilled, (state, action) => {
        state.loading = false;
        if (state.upcomingPayments) {
          state.upcomingPayments = state.upcomingPayments.filter(p => p.schedule_id !== action.payload.scheduleId);
        }
        state.error = null;
      })
      .addCase(cancelScheduledPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

    // Get scheduled payments
    builder
      .addCase(getScheduledPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getScheduledPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.upcomingPayments = action.payload.scheduled || [];
        state.error = null;
      })
      .addCase(getScheduledPayments.rejected, (state, action) => {
        state.loading = false;
        state.upcomingPayments = initialState.upcomingPayments;
        state.error = action.payload;
      })

    // Handle webhook
    builder
      .addCase(handleWebhook.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleWebhook.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })

    // Update automation settings
    builder
      .addCase(updateAutomationSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAutomationSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateAutomationSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

    // Clear error
    builder
      .addCase(clearError, (state) => {
        state.error = null;
      })

    // Set loading state
    builder
      .addCase(setLoading, (state, action) => {
        state.loading = action.payload;
      })

    // Update filters
    builder
      .addCase(updateFilters, (state, action) => {
        state.filters = { ...state.filters, ...action.payload };
      })

    // Update pagination
    builder
      .addCase(updatePagination, (state, action) => {
        state.pagination = { ...state.pagination, ...action.payload };
      })

    // Set sorting
    builder
      .addCase(setSorting, (state, action) => {
        state.sortBy = action.payload.sortBy;
        state.sortOrder = action.payload.sortOrder;
      })

    // Clear sync status
    builder
      .addCase(clearSyncingCards, (state) => {
        state.cards = state.cards.map(card => ({
          ...card,
          syncing: false,
          api_status: card.syncing ? 'connected' : card.api_status,
        }));
      });

    // Set card as syncing
    builder
      .addCase(setSyncingCard, (state, action) => {
        state.cards = state.cards.map(card =>
          card.id === action.payload.id
            ? { ...card, syncing: true, api_status: 'syncing' }
            : card
        ));
      });

    // Set card sync status
    builder
      .addCase(setCardSyncStatus, (state, action) => {
        state.cards = state.cards.map(card =>
          card.id === action.payload.cardId
            ? { ...card, api_status: action.payload.status, last_sync: new Date().toISOString() }
            : card
        ));
      });

    // Add to upcoming payments
    builder
      .addCase(addUpcomingPayment, (state, action) => {
      if (action.payload.card_id) {
        state.upcomingPayments.push({
          ...action.payload,
          status: 'scheduled',
          created_at: new Date().toISOString(),
        });
      }
    })

    // Update card with payment response
    builder
      .addCase(updateCardWithPayment, (state, action) => {
        if (action.payload.card && action.payload.payment) {
          state.cards = state.cards.map(card =>
            card.id === action.payload.card.id
              ? {
                  ...card,
                  ...action.payload.payment,
                  current_balance: action.payload.payment.current_balance || card.current_balance,
                  minimum_due: action.payload.payment.minimum_due || card.minimum_due,
                  total_due: action.payload.payment.total_due || card.total_due,
                  payment_due_date: action.payload.payment.payment_due_date || card.payment_due_date,
                  api_status: 'connected',
                  last_sync: new Date().toISOString(),
                }
              : card
          });
        }
      });

    // Update payment with webhook response
    builder
      .addCase(updatePaymentWithWebhook, (state, action) => {
        if (action.payload.payment && action.payload.card_id) {
          // Find payment in upcoming or history
          const allPayments = [...state.upcomingPayments, ...state.paymentHistory];
          const paymentIndex = allPayments.findIndex(p => p.id === action.payload.payment_id);

          if (paymentIndex !== -1) {
            const payment = allPayments[paymentIndex];
            const updatedPayment = {
              ...payment,
              status: action.payload.webhook?.type === 'payment.captured' ? 'completed' : 'failed',
              gateway_order_id: action.payload.webhook?.payload?.order_id,
              transaction_id: action.payload.webhook?.payload?.payment_intent?.id,
            };

            // Update the payment in the appropriate array
            if (paymentIndex < state.upcomingPayments.length) {
              state.upcomingPayments[paymentIndex] = updatedPayment;
            } else {
              state.paymentHistory.unshift(updatedPayment);
            }

            // Update the card if needed
            if (action.payload.card) {
              state.cards = state.cards.map(card =>
                card.id === action.payload.card_id
                  ? {
                      ...card,
                      ...action.payload.webhook?.payload,
                      minimum_due: action.payload.webhook?.payload?.metadata?.minimum_due,
                      total_due: action.payload.webhook?.payload?.metadata?.total_due,
                      payment_due_date: action.payload.webhook?.payload?.metadata?.due_date,
                      current_balance: action.payload.webhook?.payload?.metadata?.current_balance,
                      api_status: action.payload.webhook?.type === 'payment.captured' ? 'connected' : 'error',
                      last_sync: new Date().toISOString(),
                    }
                  : card
              });
            }
          }
        }
      })
      .addCase(updatePaymentWithWebhook.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Get automation settings
    builder
      .addCase(getAutomationSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAutomationSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.automationSettings = action.payload;
      })
      .addCase(getAutomationSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
  },
  extraReducers: (builder) => {
    // Handle persisted data rehydration
    builder
      .addCase('persist/REHYDRATE', (state, action) => {
      // Rehydrate persisted state
      return {
        ...state,
        cards: action.payload?.cards || [],
        paymentHistory: action.payload?.paymentHistory || [],
        upcomingPayments: action.payload?.upcomingPayments || [],
        paymentSummary: action.payload?.paymentSummary || initialState.paymentSummary,
        automationSettings: action.payload?.automationSettings || initialState.automationSettings,
      };
    })
  },
});

// Export actions and selectors
export const {
  fetchUpcomingPayments,
  fetchPaymentHistory,
  fetchPaymentSummary,
  createPayment,
  schedulePayment,
  getPayment,
  updatePayment,
  cancelPayment,
  cancelScheduledPayment,
  getScheduledPayments,
  getAutomationSettings,
  updateAutomationSettings,
  handleWebhook,
  addUpcomingPayment,
  updateCardWithPayment,
  updateCardWithWebhook,
  setSyncingCards,
  setCardSyncStatus,
  clearError,
  setLoading,
  updateFilters,
  updatePagination,
  setSorting,
  clearSyncingCards,
} = paymentsSlice.actions;

// Selectors
export const selectUpcomingPayments = (state) => state.payments.upcomingPayments;
export const selectPaymentHistory = (state) => state.payments.paymentHistory;
export const selectPaymentSummary = (state) => state.payments.paymentSummary;
export const selectCurrentPayment = (state) => state.payments.payment;
export const selectPaymentsLoading = (state) => state.payments.loading;
export const selectPaymentsError = (state) => state.payments.error;
export const selectPagination = (state) => state.payments.pagination;
export const selectFilters = (state) => state.payments.filters;
export const selectAutomationSettings = (state) => state.payments.automationSettings;

export default paymentsSlice.reducer;