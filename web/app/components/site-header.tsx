"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Menu, Settings, ShoppingBag, UserRound, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { BrandLockup } from "@/app/components/brand-lockup";
import { useShop } from "@/app/components/shop-provider";
import { androidApkDownloadUrl } from "@/lib/android-app";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { itemCount } = useShop();

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAvatarFailed(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const picture = user?.user_metadata.picture;
  const avatarUrl =
    typeof picture === "string"
      ? picture
      : typeof user?.user_metadata.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null;

  function openCart() {
    window.dispatchEvent(new Event("pelz:open-cart"));
  }

  async function signOut() {
    setSignOutError("");
    const { error } = await createBrowserSupabase().auth.signOut();
    if (error) {
      setSignOutError("Sign out failed. Please try again.");
      return;
    }
    setProfileMenuOpen(false);
  }

  return (
    <header className="site-header">
      <BrandLockup />
      <nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
        <Link href="/#shop" onClick={() => setMenuOpen(false)}>
          Shop all
        </Link>
        <Link href="/#shop" onClick={() => setMenuOpen(false)}>
          Home comforts
        </Link>
        <Link href="/#shop" onClick={() => setMenuOpen(false)}>
          Bags &amp; more
        </Link>
        <Link href="/#our-story" onClick={() => setMenuOpen(false)}>
          Our story
        </Link>
        <a
          className="main-nav-download"
          href={androidApkDownloadUrl}
          onClick={() => setMenuOpen(false)}
        >
          <Image
            src="/pelzlogo.png"
            alt=""
            width={20}
            height={20}
            className="app-download-icon"
          />
          Download app
        </a>
      </nav>
      <div className="header-actions">
        {user ? (
          <div className="profile-menu" ref={profileMenuRef}>
            <button
              className="header-icon"
              type="button"
              aria-label="Open account menu"
              aria-expanded={profileMenuOpen}
              aria-controls="profile-menu-options"
              title={user.email ?? "Account menu"}
              onClick={() => {
                setProfileMenuOpen((open) => !open);
                setSignOutError("");
              }}
            >
              {avatarUrl && !avatarFailed ? (
                <Image
                  className="profile-avatar"
                  src={avatarUrl}
                  alt=""
                  width={28}
                  height={28}
                  unoptimized
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <UserRound size={18} strokeWidth={1.5} />
              )}
            </button>
            {profileMenuOpen && (
              <div className="profile-menu-options" id="profile-menu-options" role="menu">
                <p className="profile-menu-email">{user.email}</p>
                <Link
                  className="profile-menu-item"
                  href="/account/settings"
                  role="menuitem"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <Settings size={16} strokeWidth={1.6} /> Settings
                </Link>
                <button
                  className="profile-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                >
                  <LogOut size={16} strokeWidth={1.6} /> Sign out
                </button>
                {signOutError && (
                  <p className="profile-menu-error" role="alert">
                    {signOutError}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <Link
            className="header-icon"
            href="/auth/sign-in"
            aria-label="Sign in with Google"
            title="Sign in with Google"
          >
            <UserRound size={18} strokeWidth={1.5} />
          </Link>
        )}
        <button
          className="header-icon"
          type="button"
          aria-label={`Open shopping bag, ${itemCount} items`}
          onClick={openCart}
        >
          <ShoppingBag size={19} strokeWidth={1.5} />
          {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
        </button>
        <button
          className="header-icon mobile-menu-button"
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
