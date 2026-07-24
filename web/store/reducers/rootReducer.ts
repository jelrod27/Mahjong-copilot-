import { combineReducers } from 'redux';
import { progressReducer } from './progressReducer';
import { settingsReducer } from './settingsReducer';

export const rootReducer = combineReducers({
  progress: progressReducer,
  settings: settingsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
