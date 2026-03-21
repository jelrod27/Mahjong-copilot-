import { UserProfile } from '@/models/UserProfile';

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  errorMessage: string | null;
}

export const AUTH_INITIALIZE = 'AUTH_INITIALIZE';
export const AUTH_SIGN_IN_START = 'AUTH_SIGN_IN_START';
export const AUTH_SIGN_IN_SUCCESS = 'AUTH_SIGN_IN_SUCCESS';
export const AUTH_SIGN_IN_FAILURE = 'AUTH_SIGN_IN_FAILURE';
export const AUTH_SIGN_UP_START = 'AUTH_SIGN_UP_START';
export const AUTH_SIGN_UP_SUCCESS = 'AUTH_SIGN_UP_SUCCESS';
export const AUTH_SIGN_UP_FAILURE = 'AUTH_SIGN_UP_FAILURE';
export const AUTH_SIGN_OUT_START = 'AUTH_SIGN_OUT_START';
export const AUTH_SIGN_OUT_SUCCESS = 'AUTH_SIGN_OUT_SUCCESS';
export const AUTH_SIGN_OUT_FAILURE = 'AUTH_SIGN_OUT_FAILURE';
export const AUTH_UPDATE_PROFILE_START = 'AUTH_UPDATE_PROFILE_START';
export const AUTH_UPDATE_PROFILE_SUCCESS = 'AUTH_UPDATE_PROFILE_SUCCESS';
export const AUTH_UPDATE_PROFILE_FAILURE = 'AUTH_UPDATE_PROFILE_FAILURE';
export const AUTH_CLEAR_ERROR = 'AUTH_CLEAR_ERROR';

// Stub auth actions — Firebase auth will be added later
export const initializeAuth = () => async (dispatch: any) => {
  dispatch({ type: AUTH_INITIALIZE });
  // No-op: Firebase auth not yet configured
};

export const clearAuthError = () => ({
  type: AUTH_CLEAR_ERROR,
});
