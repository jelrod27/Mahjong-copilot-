"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppDispatch } from "@/store/hooks";
import {
  AUTH_SIGN_IN_SUCCESS,
  AUTH_SIGN_OUT_SUCCESS,
  mapSupabaseUser,
} from "@/store/actions/authActions";

export function AuthStateListener({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const supabase = createClient();

    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        dispatch({ type: AUTH_SIGN_IN_SUCCESS, payload: mapSupabaseUser(user) });
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        dispatch({
          type: AUTH_SIGN_IN_SUCCESS,
          payload: mapSupabaseUser(session.user),
        });
      } else {
        dispatch({ type: AUTH_SIGN_OUT_SUCCESS });
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
}
