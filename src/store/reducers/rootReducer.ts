import {combineReducers} from 'redux';
import {authReducer} from './authReducer';
import {progressReducer} from './progressReducer';
import {gameReducer} from './gameReducer';
import {settingsReducer} from './settingsReducer';

export const rootReducer = combineReducers({
  auth: authReducer,
  progress: progressReducer,
  game: gameReducer,
  settings: settingsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

