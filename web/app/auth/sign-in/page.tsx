"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/app/components/brand-lockup";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    const searchParams = new URLSearchParams(window.location.search);
    const callbackError = searchParams.get("error");
    const messages: Record<string, string> = {
      cancelled: "Google sign-in was cancelled. You can try again whenever you're ready.",
      provider_error: "Google couldn't complete sign-in. Please try again.",
      missing_code: "Google didn't return a sign-in code. Please try again.",
      exchange_failed:
        "We couldn't finish signing you in. Check your connection and try again.",
    };

    createBrowserSupabase()
      .auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError("We couldn't check your sign-in. Check your connection and try again.");
        } else if (data.session) {
          router.replace("/checkout");
          return;
        } else if (callbackError && messages[callbackError]) {
          setError(messages[callbackError]);
        }
        setCheckingSession(false);
      })
      .catch((sessionError: unknown) => {
        if (!active) return;
        console.warn("Could not check the existing Supabase session", {
          errorName: sessionError instanceof Error ? sessionError.name : "UnknownError",
        });
        setError("We couldn't check your sign-in. Check your connection and try again.");
        setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const supabase = createBrowserSupabase();
      const searchParams = new URLSearchParams(window.location.search);
      const requestedPath = searchParams.get("next");
      const nextPath =
        requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
          ? requestedPath
          : "/checkout";
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.toString() },
      });
      if (authError) throw authError;
    } catch (signInError) {
      console.warn("Google sign-in could not be started", {
        errorName: signInError instanceof Error ? signInError.name : "UnknownError",
      });
      setError("We couldn't start Google sign-in. Check your connection and try again.");
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
        {checkingSession ? (
          <p role="status">Checking your sign-in…</p>
        ) : (
          <>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button auth-google"
          type="button"
          onClick={signInWithGoogle}
          disabled={loading || checkingSession}
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
          </>
        )}
      </div>
    </section>
  );
}
