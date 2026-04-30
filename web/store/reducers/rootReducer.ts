import { combineReducers } from 'redux';
import { progressReducer } from './progressReducer';
import { gameReducer } from './gameReducer';
import { settingsReducer } from './settingsReducer';

export const rootReducer = combineReducers({
  progress: progressReducer,
  game: gameReducer,
  settings: settingsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
