"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  signUpWithEmail,
  signInWithGoogle,
  clearAuthError,
} from "@/store/actions/authActions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, errorMessage } = useAppSelector((state) => state.auth);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    dispatch(clearAuthError());

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }

    await dispatch(signUpWithEmail(email, password) as any);
    router.push("/");
  };

  const handleGoogleSignIn = () => {
    dispatch(signInWithGoogle() as any);
  };

  const displayError = localError || errorMessage;

  return (
    <div className="min-h-screen bg-retro-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center">
          <h1 className="font-pixel text-xl text-retro-gold retro-glow-strong mb-2">
            16 BIT MAHJONG
          </h1>
          <p className="text-retro-textDim text-sm">
            Create your account to start learning
          </p>
        </div>

        <Card className="neo-retro-card">
          <CardContent className="p-6 space-y-5">
            {/* Error display */}
            {displayError && (
              <div className="p-3 rounded-sm bg-retro-accent/10 border border-retro-accent/30 text-retro-accent text-sm">
                {displayError}
              </div>
            )}

            {/* Sign Up Form */}
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs text-retro-textDim mb-1.5 font-pixel uppercase tracking-wider">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@example.com"
                  required
                  className="bg-retro-bgLight border-retro-border/30 text-retro-text placeholder:text-retro-textDim/50 focus:border-retro-cyan rounded-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-retro-textDim mb-1.5 font-pixel uppercase tracking-wider">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-retro-bgLight border-retro-border/30 text-retro-text placeholder:text-retro-textDim/50 focus:border-retro-cyan rounded-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-retro-textDim mb-1.5 font-pixel uppercase tracking-wider">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-retro-bgLight border-retro-border/30 text-retro-text placeholder:text-retro-textDim/50 focus:border-retro-cyan rounded-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-retro-green hover:bg-retro-green/80 text-black font-medium rounded-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-retro-border/20" />
              <span className="text-xs text-retro-textDim">or</span>
              <div className="flex-1 h-px bg-retro-border/20" />
            </div>

            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full border-retro-border/30 bg-retro-bgLight text-retro-text hover:bg-retro-panel rounded-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Login link */}
            <p className="text-center text-sm text-retro-textDim">
              Already have an account?{" "}
              <Link href="/login" className="text-retro-cyan hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
