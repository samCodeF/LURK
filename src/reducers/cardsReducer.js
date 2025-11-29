/**
 * Cards Reducer
 * Manages credit cards and payment data
 */

import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  cards: [],
  isLoading: false,
  error: null,
  selectedCard: null,
  payments: [],
};

const cardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    fetchCardsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchCardsSuccess: (state, action) => {
      state.isLoading = false;
      state.cards = action.payload;
      state.error = null;
    },
    fetchCardsFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    addCard: (state, action) => {
      state.cards.push(action.payload);
    },
    updateCard: (state, action) => {
      const index = state.cards.findIndex(
        card => card.id === action.payload.id,
      );
      if (index !== -1) {
        state.cards[index] = action.payload;
      }
    },
    deleteCard: (state, action) => {
      state.cards = state.cards.filter(card => card.id !== action.payload);
    },
    selectCard: (state, action) => {
      state.selectedCard = action.payload;
    },
    addPayment: (state, action) => {
      state.payments.unshift(action.payload);
    },
    updatePayment: (state, action) => {
      const index = state.payments.findIndex(
        payment => payment.id === action.payload.id,
      );
      if (index !== -1) {
        state.payments[index] = action.payload;
      }
    },
  },
});

export const {
  fetchCardsStart,
  fetchCardsSuccess,
  fetchCardsFailure,
  addCard,
  updateCard,
  deleteCard,
  selectCard,
  addPayment,
  updatePayment,
} = cardsSlice.actions;

export default cardsSlice.reducer;