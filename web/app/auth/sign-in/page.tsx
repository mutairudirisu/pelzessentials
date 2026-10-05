"use client";

import { useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/app/components/brand-lockup";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function SignInPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const supabase = createBrowserSupabase();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/checkout` },
      });
      if (authError) throw authError;
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Sign-in couldn't be started.");
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <BrandLockup />
        <p className="eyebrow">Your little corner of Pelz</p>
        <h1>Welcome back.</h1>
        <p>Sign in to make checkout feel a little more familiar.</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button auth-google"
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle size={16} className="auth-spinner" />
          ) : (
            <span className="google-g" aria-hidden="true">
              G
            </span>
          )}
          {loading ? "Connecting to Google…" : "Continue with Google"}
        </button>
        <Link className="auth-back" href="/checkout">
          <ArrowLeft size={14} /> Continue as a guest
        </Link>
        <p className="auth-privacy">
          Your account information stays private. We only use it to make your experience smoother.
        </p>
      </div>
    </section>
  );
}
