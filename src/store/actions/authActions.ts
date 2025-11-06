import {UserProfile, userProfileFromFirebaseUser, userProfileToJson} from '../../models/UserProfile';
import FirebaseService from '../../services/firebaseService';
import StorageService from '../../services/storageService';

// Types
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

// Action Creators
export const initializeAuth = () => async (dispatch: any) => {
  dispatch({type: AUTH_INITIALIZE});
  try {
    const currentUser = FirebaseService.getAuth().currentUser;
    if (currentUser) {
      const user = userProfileFromFirebaseUser(currentUser);
      await loadUserProfile(user.uid)(dispatch);
      dispatch({type: AUTH_SIGN_IN_SUCCESS, payload: user});
    }
  } catch (error: any) {
    dispatch({type: AUTH_INITIALIZE, payload: {error: error.message}});
  }
};

export const signInWithEmail = (email: string, password: string) => async (dispatch: any) => {
  dispatch({type: AUTH_SIGN_IN_START});
  try {
    const credential = await FirebaseService.getAuth().signInWithEmailAndPassword(email, password);
    if (credential.user) {
      const user = userProfileFromFirebaseUser(credential.user);
      await loadUserProfile(user.uid)(dispatch);
      dispatch({type: AUTH_SIGN_IN_SUCCESS, payload: user});
      await FirebaseService.logEvent('user_sign_in', {method: 'email'});
    }
  } catch (error: any) {
    const errorMessage = getAuthErrorMessage(error.code);
    dispatch({type: AUTH_SIGN_IN_FAILURE, payload: errorMessage});
  }
};

export const signUpWithEmail = (email: string, password: string) => async (dispatch: any) => {
  dispatch({type: AUTH_SIGN_UP_START});
  try {
    const credential = await FirebaseService.getAuth().createUserWithEmailAndPassword(email, password);
    if (credential.user) {
      const user = userProfileFromFirebaseUser(credential.user);
      await saveUserProfile(user)(dispatch);
      dispatch({type: AUTH_SIGN_UP_SUCCESS, payload: user});
      await FirebaseService.logEvent('user_sign_up', {method: 'email'});
    }
  } catch (error: any) {
    const errorMessage = getAuthErrorMessage(error.code);
    dispatch({type: AUTH_SIGN_UP_FAILURE, payload: errorMessage});
  }
};

export const signOut = () => async (dispatch: any) => {
  dispatch({type: AUTH_SIGN_OUT_START});
  try {
    await FirebaseService.getAuth().signOut();
    await StorageService.clear();
    dispatch({type: AUTH_SIGN_OUT_SUCCESS});
    await FirebaseService.logEvent('user_sign_out', null);
  } catch (error: any) {
    dispatch({type: AUTH_SIGN_OUT_FAILURE, payload: error.message});
  }
};

export const updateProfile = (displayName?: string, photoUrl?: string) => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.auth.user) return;

  dispatch({type: AUTH_UPDATE_PROFILE_START});
  try {
    const user = FirebaseService.getAuth().currentUser;
    if (user) {
      if (displayName) await user.updateProfile({displayName});
      if (photoUrl) await user.updateProfile({photoURL: photoUrl});
      const updatedUser = userProfileFromFirebaseUser(user);
      await saveUserProfile(updatedUser)(dispatch);
      dispatch({type: AUTH_UPDATE_PROFILE_SUCCESS, payload: updatedUser});
    }
  } catch (error: any) {
    dispatch({type: AUTH_UPDATE_PROFILE_FAILURE, payload: error.message});
  }
};

export const clearAuthError = () => ({
  type: AUTH_CLEAR_ERROR,
});

// Helper functions
const loadUserProfile = (uid: string) => async (dispatch: any) => {
  try {
    const doc = await FirebaseService.getFirestore().collection('users').doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      // Update user profile with Firestore data
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
  }
};

const saveUserProfile = (user: UserProfile) => async (dispatch: any) => {
  try {
    await FirebaseService.getFirestore()
      .collection('users')
      .doc(user.uid)
      .set(userProfileToJson(user), {merge: true});
  } catch (error) {
    console.error('Failed to save user profile:', error);
  }
};

const userProfileToJson = (profile: UserProfile): Record<string, any> => {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    photoUrl: profile.photoUrl,
    createdAt: profile.createdAt.toISOString(),
    lastLoginAt: profile.lastLoginAt.toISOString(),
    isPremium: profile.isPremium,
  };
};

const getAuthErrorMessage = (code: string): string => {
  const errorMap: Record<string, string> = {
    'weak-password': 'The password provided is too weak.',
    'email-already-in-use': 'An account already exists for this email.',
    'user-not-found': 'No user found for this email.',
    'wrong-password': 'Wrong password provided.',
    'invalid-email': 'Invalid email address.',
  };
  return errorMap[code] || 'Authentication failed. Please try again.';
};

