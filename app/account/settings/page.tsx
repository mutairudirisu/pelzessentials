"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function AccountSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user);
        setLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const displayName =
    typeof user?.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user?.user_metadata.name === "string"
        ? user.user_metadata.name
        : "Not provided";

  return (
    <section className="account-settings-page">
      <Link className="auth-back" href="/">
        <ArrowLeft size={14} /> Back to shopping
      </Link>
      <p className="eyebrow">Your Pelz account</p>
      <h1>Settings</h1>
      <p className="account-settings-intro">View the account details connected to your sign-in.</p>
      {loading ? (
        <p className="account-settings-note" role="status">
          Loading account details…
        </p>
      ) : user ? (
        <div className="account-settings-content">
          <h2>Profile</h2>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{displayName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email ?? "Not provided"}</dd>
            </div>
            <div>
              <dt>Signed in with</dt>
              <dd>{user.app_metadata.provider ?? "Google"}</dd>
            </div>
          </dl>
          <p className="account-settings-note">
            Profile details are managed by your sign-in provider and can’t be changed here.
          </p>
        </div>
      ) : (
        <div className="account-settings-content">
          <h2>Sign in required</h2>
          <p className="account-settings-note">
            Sign in to view the account connected to your orders.
          </p>
          <Link className="button account-settings-signin" href="/auth/sign-in">
            Sign in
          </Link>
        </div>
      )}
    </section>
  );
}
