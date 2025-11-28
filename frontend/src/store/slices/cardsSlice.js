/**
 * Cards Slice - Credit Card State Management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Import services
import { ApiService } from '../../services/ApiService';
import { StorageService } from '../../services/StorageService';

// Initial state
const initialState = {
  cards: [],
  loading: false,
  error: null,
  syncingCards: [], // Track which cards are currently syncing
  activeCardId: null,
  filter: {
    search: '',
    bank: null,
    status: null,
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
  },
  sortBy: 'created_at',
  sortOrder: 'desc',
};

// Async thunks
export const fetchCards = createAsyncThunk(
  'cards/fetchCards',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.get('/cards');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cards');
    }
  }
);

export const addCard = createAsyncThunk(
  'cards/addCard',
  async (cardData, { rejectWithValue }) => {
    try {
      const response = await ApiService.post('/cards', cardData);

      // Update local storage
      const currentCards = await StorageService.getCardsData();
      if (currentCards.cards) {
        const updatedCards = [...currentCards.cards, response.card];
        await StorageService.storeCardsData({
          ...currentCards,
          last_updated: new Date().toISOString(),
        });
      }

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add card');
    }
  }
);

export const updateCard = createAsyncThunk(
  'cards/updateCard',
  async ({ cardId, cardData }, { rejectWithValue }) => {
    try {
      const response = await ApiService.put(`/cards/${cardId}`, cardData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update card');
    }
  }
);

export const deleteCard = createAsyncThunk(
  'cards/deleteCard',
  async (cardId, { rejectWithValue }) => {
    try {
      // Remove from local storage first
      await StorageService.removeCard(cardId);

      const response = await ApiService.delete(`/cards/${cardId}`);
      return response;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Failed to delete card');
    }
  }
);

export const syncCard = createAsyncThunk(
  'cards/syncCard',
  async (cardId, { rejectWithValue }) => {
    try {
      // Mark card as syncing in local state
      const currentCards = await StorageService.getCardsData();
      if (currentCards.cards) {
        const updatedCards = currentCards.cards.map(card =>
          card.id === cardId ? { ...card, api_status: 'syncing' } : card
        );
        await StorageService.storeCardsData({
          ...currentCards,
          last_updated: new Date().toISOString(),
        });
      }

      const response = await ApiService.post(`/cards/${cardId}/sync`);
      return response;
    } catch (error) {
        // Remove syncing status on error
        const currentCards = await StorageService.getCardsData();
        if (currentCards.cards) {
          const updatedCards = currentCards.cards.map(card =>
            card.id === cardId ? { ...card, api_status: 'error' } : card
          );
          await StorageService.storeCardsData({
            ...currentCards,
            last_updated: new Date().toISOString(),
          });
        }

        return rejectWithValue(error.response?.data?.message || 'Failed to sync card');
    }
  }
);

export const enableAutomation = createAsyncThunk(
  'cards/enableAutomation',
  async ({ cardId, paymentPreference, customAmount, bufferHours }, { rejectWithValue }) => {
    try {
      const response = await ApiService.post(`/cards/${cardId}/enable-automation`, {
        payment_preference,
        custom_amount: customAmount,
        buffer_hours: bufferHours,
      });

      // Update local storage
      const currentCards = await StorageService.getCardsData();
      if (currentCards.cards) {
        const updatedCards = currentCards.cards.map(card =>
          card.id === cardId ? { ...card, auto_payment_enabled: true } : card
          });
        await StorageService.storeCardsData({
          ...currentCards,
          last_updated: new Date().toISOString(),
        });
      }

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to enable automation');
    }
  }
);

export const disableAutomation = createAsyncThunk(
  'cards/disableAutomation',
  async (cardId, { rejectWithValue }) => {
    try {
      // Cancel scheduled payments first
      await ApiService.post(`/payments/scheduled/cancel?card_id=${cardId}`);

      const response = await ApiService.post(`/cards/${cardId}/disable-automation`);

      // Update local storage
      const currentCards = await StorageService.getCardsData();
      if (currentCards.cards) {
        const updatedCards = currentCards.cards.map(card =>
          card.id === cardId ? { ...card, auto_payment_enabled: false } : card
          });
        await StorageService.storeCardsData({
          ...currentCards,
          last_updated: new Date().toISOString(),
        });
      }

      return response;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Failed to disable automation');
    }
  }
);

export const getCardStatement = createAsyncThunk(
  'cards/getCardStatement',
  async ({ cardId, month, year }, { rejectWithValue }) => {
    try {
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;

      const response = await ApiService.get(`/cards/${cardId}/statement`, params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch card statement');
    }
  }
);

export const getCardBalance = createAsyncThunk(
  'cards/getCardBalance',
  async (cardId, { rejectWithValue }) => {
    try {
      const response = await ApiService.get(`/cards/${cardId}/balance`);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch card balance');
    }
  }
);

// Create slice
const cardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
      state.error = null;
    },

    // Set cards
    setCards: (state, action) => {
      state.cards = action.payload;
      state.loading = false;
      state.error = null;
    },

    // Add card
    addCard: (state, action) => {
      if (action.meta.requestStatus === 'pending') {
        state.loading = true;
      state.error = null;
      } else if (action.meta.requestStatus === 'fulfilled') {
        state.loading = false;
        state.cards.push(action.payload);
        state.error = null;
      } else if (action.meta.requestStatus === 'rejected') {
        state.loading = false;
        state.error = action.payload;
      }
    },

    // Update card
    updateCard: (state, action) => {
      if (action.meta.requestStatus === 'pending') {
        state.loading = true;
        state.error = null;
      } else if (action.meta.requestStatus === 'fulfilled') {
        state.loading = false;
        const index = state.cards.findIndex(card => card.id === action.payload.id);
        if (index !== -1) {
          state.cards[index] = { ...state.cards[index], ...action.payload };
          state.error = null;
        }
      } else if (action.meta.requestStatus === 'rejected') {
        state.loading = false;
        state.error = action.payload;
      }
    },

    // Delete card
    deleteCard: (state, action) => {
      if (action.meta.requestStatus === 'pending') {
        state.loading = true;
        state.error = null;
      } else if (action.meta.requestStatus === 'fulfilled') {
        state.loading = false;
        state.cards = state.cards.filter(card => card.id !== action.payload);
        state.error = null;
      } else if (action.meta.requestStatus === 'rejected') {
        state.loading = false;
        state.error = action.payload;
      }
    },

    // Set syncing status
    setSyncingCards: (state, action) => {
      const cardIds = Array.isArray(action.payload) ? action.payload : [action.payload];

      state.syncingCards = cardIds;

      // Update cards that are syncing
      state.cards = state.cards.map(card =>
        cardIds.includes(card.id)
          ? { ...card, api_status: 'syncing' }
          : card
      );
    },

    // Clear syncing status
    clearSyncingCards: (state) => {
      state.syncingCards = [];
      // Update cards that were syncing - clear their sync status
      state.cards = state.cards.map(card =>
        state.syncingCards.includes(card.id)
          ? { ...card, api_status: 'connected' }
          : card
      );
    },

    // Set active card
    setActiveCardId: (state, action) => {
      state.activeCardId = action.payload;
    },

    // Update filters
    updateFilters: (state, action) => {
      state.filter = {
        ...state.filter,
        ...action.payload,
      };
    },

    // Update pagination
    updatePagination: (state, action) => {
      state.pagination = {
        ...state.pagination,
        ...action.payload,
      };
    },

    // Set sorting
    setSorting: (state, action) => {
      state.sortBy = action.payload.sortBy || 'created_at';
      state.sortOrder = action.payload.sortOrder || 'desc';
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Handle card sync completion
    updateCardSyncStatus: (state, action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        const card = action.payload;
        const index = state.cards.findIndex(c => c.id === card.id);

        if (index !== -1) {
          state.cards[index] = card;

          // Clear from syncing if it was syncing
          if (state.syncingCards.includes(card.id)) {
            state.syncingCards = state.syncingCards.filter(id => id !== card.id);
          }

          // Clear syncing status
          if (card.api_status === 'syncing') {
            state.cards[index] = { ...card, api_status: card.api_status === 'success' ? 'connected' : card.api_status };
          }
        }
      }
    },

    // Clear all cards
    clearCards: (state) => {
      state.cards = [];
      state.filter = initialState.filter;
      state.pagination = initialState.pagination;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle persisted card data rehydration
      .addCase('persist/REHYDRATE', (state) => {
        if (action.payload?.auth?.cards) {
          return {
            ...state,
            cards: action.payload.auth.cards.map(card => ({
              ...card,
              // Ensure we don't overwrite server state with local state
              api_status: card.api_status || 'disconnected',
              current_balance: card.current_balance || null,
              minimum_due: card.minimum_due || null,
              total_due: card.total_due || null,
              last_sync: card.last_sync || null,
            })),
          };
        }
        return state;
      })
      .addCase('cards/fetchCards/fulfilled', (state, action) => {
        state.loading = false;
        state.cards = action.payload.map(card => ({
          ...card,
          api_status: card.api_status || 'connected',
          // Only store essential fields locally
          current_balance: card.current_balance || null,
          minimum_due: card.minimum_due || null,
          total_due: card.total_due || null,
          last_sync: card.last_sync || null,
        }));
        return state;
      })
      .addCase('cards/fetchCards/rejected', (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase('cards/addCard/fulfilled', (state, action) => {
        state.loading = false;
        state.cards.push({
          ...action.payload.card,
          // Initialize new card fields
          api_status: 'connected',
          current_balance: 0,
          minimum_due: 0,
          total_due: 0,
          created_at: action.payload.card.created_at || new Date().toISOString(),
          last_sync: action.payload.card.last_sync || null,
        });
      })
      .addCase('cards/updateCard/fulfilled', (state, action) => {
        const index = state.cards.findIndex(card => card.id === action.payload.id);
        if (index !== -1) {
          state.cards[index] = {
            ...state.cards[index],
            ...action.payload,
            updated_at: new Date().toISOString(),
          };
        }
      })
      .addCase('cards/deleteCard/fulfilled', (state, action) => {
        state.cards = state.cards.filter(card => card.id !== action.payload);
        state.loading = false;
      })
      .addCase('cards/syncCard/pending', (state, action) => {
        const cardId = action.meta.arg;
        state.syncingCards = state.syncingCards.includes(cardId)
          ? state.syncingCards
          : [...state.syncingCards, cardId];
      })
      .addCase('cards/syncCard/fulfilled', (state, action) => {
        const cardId = action.meta.arg;
        const index = state.cards.findIndex(card => card.id === cardId);

        if (index !== -1) {
          state.cards[index] = {
            ...state.cards[index],
            ...action.payload.card,
            updated_at: new Date().toISOString(),
          };

          // Clear from syncing
          state.syncingCards = state.syncingCards.filter(id => id !== cardId);
        }
      })
      .addCase('cards/syncCard/rejected', (state, action) => {
        const cardId = action.meta.arg;
        state.error = action.payload;

        // Clear from syncing
        state.syncingCards = state.syncingCards.filter(id => id !== cardId);

        // Update card with error status
        const index = state.cards.findIndex(card => card.id === cardId);
        if (index !== -1) {
          state.cards[index] = { ...state.cards[index], api_status: 'error' };
        }
      })
      .addCase('cards/enableAutomation/fulfilled', (state, action) => {
        const cardId = action.meta.arg;
        const index = state.cards.findIndex(card => card.id === cardId);

        if (index !== -1) {
          state.cards[index] = { ...state.cards[index], ...action.payload };
        }
      })
      .addCase('cards/disableAutomation/fulfilled', (state, action) => {
        const cardId = action.meta.arg;
        const index = state.cards.findIndex(card => card.id === cardId);

        if (index !== -1) {
          state.cards[index] = { ...state.cards[index], auto_payment_enabled: false };
        }
      })
      .addCase('cards/setSyncingCards', (state, action) => {
        state.syncingCards = action.payload;
      })
      .addCase('cards/clearSyncingCards', (state) => {
        state.syncingCards = [];
      })
      .addCase('cards/setActiveCardId', (state, action) => {
        state.activeCardId = action.payload;
      })
      .addCase('cards/updateFilters', (state, action) => {
        state.filter = {
          ...state.filter,
          ...action.payload,
        };
      })
      .addCase('cards/updatePagination', (state, action) => {
        state.pagination = {
          ...state.pagination,
          ...action.payload,
        };
      })
      .addCase('cards/setSorting', (state, action) => {
        state.sortBy = action.payload.sortBy || 'created_at';
        state.sortOrder = action.payload.sortOrder || 'desc';
      })
      .addCase('cards/clearError', (state, action) => {
        state.error = null;
      })
      .addCase('cards/clearCards', (state, action) => {
        state.cards = [];
        state.filter = initialState.filter;
        state.pagination = initialState.pagination;
      })
  },
});

// Export actions
export const {
  fetchCards,
  addCard,
  updateCard,
  deleteCard,
  syncCard,
  enableAutomation,
  disableAutomation,
  getCardStatement,
  getCardBalance,
  setSyncingCards,
  setActiveCardId,
  updateFilters,
  updatePagination,
  setSorting,
  clearError,
  clearCards,
  updateCardSyncStatus,
} = cardsSlice.actions;

// Export reducer
export default cardsSlice.reducer;