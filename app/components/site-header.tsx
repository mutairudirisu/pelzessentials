"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { BrandLockup } from "@/app/components/brand-lockup";
import { useShop } from "@/app/components/shop-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
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
      </nav>
      <div className="header-actions">
        <Link
          className="header-icon"
          href="/auth/sign-in"
          aria-label={user?.email ? `Signed in as ${user.email}` : "Sign in with Google"}
          title={user?.email ? `Signed in as ${user.email}` : "Sign in with Google"}
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
        </Link>
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
