import { combineReducers, configureStore, Store } from '@reduxjs/toolkit';
import { createWrapper } from 'next-redux-wrapper';
import { roomsReducer } from './slices/roomsSlice';
import { userReducer } from './slices/userSlice';
import { RootState } from './types';

// скомбинировал редюсеры
export const rootReducer = combineReducers({
  rooms: roomsReducer,
  user: userReducer,
});

// функция - для next-redux-wrapper
export const makeStore = (): Store<RootState> =>
  configureStore({
    reducer: rootReducer,
  });

export const wrapper = createWrapper(makeStore, { debug: true });
