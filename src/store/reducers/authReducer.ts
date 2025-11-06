import {AuthState} from '../actions/authActions';
import {
  AUTH_INITIALIZE,
  AUTH_SIGN_IN_START,
  AUTH_SIGN_IN_SUCCESS,
  AUTH_SIGN_IN_FAILURE,
  AUTH_SIGN_UP_START,
  AUTH_SIGN_UP_SUCCESS,
  AUTH_SIGN_UP_FAILURE,
  AUTH_SIGN_OUT_START,
  AUTH_SIGN_OUT_SUCCESS,
  AUTH_SIGN_OUT_FAILURE,
  AUTH_UPDATE_PROFILE_START,
  AUTH_UPDATE_PROFILE_SUCCESS,
  AUTH_UPDATE_PROFILE_FAILURE,
  AUTH_CLEAR_ERROR,
} from '../actions/authActions';

const initialState: AuthState = {
  user: null,
  isLoading: false,
  errorMessage: null,
};

export const authReducer = (
  state: AuthState = initialState,
  action: any
): AuthState => {
  switch (action.type) {
    case AUTH_INITIALIZE:
    case AUTH_SIGN_IN_START:
    case AUTH_SIGN_UP_START:
    case AUTH_SIGN_OUT_START:
    case AUTH_UPDATE_PROFILE_START:
      return {
        ...state,
        isLoading: true,
        errorMessage: null,
      };

    case AUTH_SIGN_IN_SUCCESS:
    case AUTH_SIGN_UP_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        errorMessage: null,
      };

    case AUTH_SIGN_IN_FAILURE:
    case AUTH_SIGN_UP_FAILURE:
    case AUTH_SIGN_OUT_FAILURE:
    case AUTH_UPDATE_PROFILE_FAILURE:
      return {
        ...state,
        isLoading: false,
        errorMessage: action.payload,
      };

    case AUTH_SIGN_OUT_SUCCESS:
      return {
        ...initialState,
      };

    case AUTH_UPDATE_PROFILE_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        errorMessage: null,
      };

    case AUTH_CLEAR_ERROR:
      return {
        ...state,
        errorMessage: null,
      };

    default:
      return state;
  }
};

