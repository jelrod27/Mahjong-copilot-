import { UserProfile } from "@/models/UserProfile";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  errorMessage: string | null;
}

export const AUTH_INITIALIZE = "AUTH_INITIALIZE";
export const AUTH_SIGN_IN_START = "AUTH_SIGN_IN_START";
export const AUTH_SIGN_IN_SUCCESS = "AUTH_SIGN_IN_SUCCESS";
export const AUTH_SIGN_IN_FAILURE = "AUTH_SIGN_IN_FAILURE";
export const AUTH_SIGN_UP_START = "AUTH_SIGN_UP_START";
export const AUTH_SIGN_UP_SUCCESS = "AUTH_SIGN_UP_SUCCESS";
export const AUTH_SIGN_UP_FAILURE = "AUTH_SIGN_UP_FAILURE";
export const AUTH_SIGN_OUT_START = "AUTH_SIGN_OUT_START";
export const AUTH_SIGN_OUT_SUCCESS = "AUTH_SIGN_OUT_SUCCESS";
export const AUTH_SIGN_OUT_FAILURE = "AUTH_SIGN_OUT_FAILURE";
export const AUTH_UPDATE_PROFILE_START = "AUTH_UPDATE_PROFILE_START";
export const AUTH_UPDATE_PROFILE_SUCCESS = "AUTH_UPDATE_PROFILE_SUCCESS";
export const AUTH_UPDATE_PROFILE_FAILURE = "AUTH_UPDATE_PROFILE_FAILURE";
export const AUTH_CLEAR_ERROR = "AUTH_CLEAR_ERROR";

export function mapSupabaseUser(user: User): UserProfile {
  return {
    uid: user.id,
    email: user.email ?? "",
    displayName:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      undefined,
    photoUrl: user.user_metadata?.avatar_url ?? undefined,
    createdAt: new Date(user.created_at),
    lastLoginAt: new Date(user.last_sign_in_at ?? user.created_at),
    isPremium: false,
  };
}

export const initializeAuth = () => async (dispatch: any) => {
  dispatch({ type: AUTH_INITIALIZE });
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      dispatch({ type: AUTH_SIGN_OUT_SUCCESS });
      return;
    }
    dispatch({ type: AUTH_SIGN_IN_SUCCESS, payload: mapSupabaseUser(user) });
  } catch {
    dispatch({ type: AUTH_SIGN_OUT_SUCCESS });
  }
};

export const signInWithEmail =
  (email: string, password: string) => async (dispatch: any) => {
    dispatch({ type: AUTH_SIGN_IN_START });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        dispatch({ type: AUTH_SIGN_IN_FAILURE, payload: error.message });
        return;
      }
      dispatch({
        type: AUTH_SIGN_IN_SUCCESS,
        payload: mapSupabaseUser(data.user),
      });
    } catch (err: any) {
      dispatch({
        type: AUTH_SIGN_IN_FAILURE,
        payload: err.message ?? "Sign in failed",
      });
    }
  };

export const signUpWithEmail =
  (email: string, password: string) => async (dispatch: any) => {
    dispatch({ type: AUTH_SIGN_UP_START });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        dispatch({ type: AUTH_SIGN_UP_FAILURE, payload: error.message });
        return;
      }
      if (data.user) {
        dispatch({
          type: AUTH_SIGN_UP_SUCCESS,
          payload: mapSupabaseUser(data.user),
        });
      }
    } catch (err: any) {
      dispatch({
        type: AUTH_SIGN_UP_FAILURE,
        payload: err.message ?? "Sign up failed",
      });
    }
  };

export const signInWithGoogle = () => async (dispatch: any) => {
  dispatch({ type: AUTH_SIGN_IN_START });
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      dispatch({ type: AUTH_SIGN_IN_FAILURE, payload: error.message });
    }
    // On success, user is redirected to Google — no dispatch needed here.
  } catch (err: any) {
    dispatch({
      type: AUTH_SIGN_IN_FAILURE,
      payload: err.message ?? "Google sign in failed",
    });
  }
};

export const signOut = () => async (dispatch: any) => {
  dispatch({ type: AUTH_SIGN_OUT_START });
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      dispatch({ type: AUTH_SIGN_OUT_FAILURE, payload: error.message });
      return;
    }
    dispatch({ type: AUTH_SIGN_OUT_SUCCESS });
  } catch (err: any) {
    dispatch({
      type: AUTH_SIGN_OUT_FAILURE,
      payload: err.message ?? "Sign out failed",
    });
  }
};

export const clearAuthError = () => ({
  type: AUTH_CLEAR_ERROR,
});
