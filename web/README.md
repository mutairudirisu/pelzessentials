# Pelz Essentials

A responsive Next.js App Router storefront for home comforts, bags, gym accessories, and personal essentials. The shop can be previewed with its local sample catalog; orders require Supabase configuration.

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Add real values to `.env.local` before testing checkout. Never expose the Supabase service role key in a `NEXT_PUBLIC_` variable or commit `.env.local`.

## Supabase

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` in timestamp order. The first creates the catalog, order tables, row-level security, the atomic checkout function, and starter products. The following migrations add products, product photos, Paystack support, and the shared authenticated cart.
3. Copy the project URL, anon key, and service role key from **Project Settings → API** into `.env.local`.
4. Product reads are public and restricted to active catalog entries. Order creation is server-side and uses the service role only in the checkout route; the database function derives all prices and delivery fees itself.

Delivery is ₦3,500, waived for orders of ₦100,000 or more. Checkout supports Paystack, bank transfer, and pay on delivery. Paystack orders are confirmed only after the server verifies the transaction status and amount.

## Paystack test payments

1. Add your Paystack test secret key to `.env.local` as `PAYSTACK_SECRET_KEY=sk_test_...`. Keep it server-only; never use a `NEXT_PUBLIC_` variable or commit the key.
2. Run `supabase/migrations/20261001000000_paystack_payments.sql` in the Supabase SQL Editor after the existing migrations. It adds payment status/reference fields and server-only payment finalization.
3. Set `NEXT_PUBLIC_SITE_URL` to your app's origin in production, for example `https://your-domain.com`. Locally, the callback uses the request origin (`http://localhost:3000`).
4. In Paystack Test Mode, configure the webhook URL as `https://your-domain.com/api/checkout/paystack/webhook` and enable the `charge.success` event. Paystack cannot reach `localhost`; use a public HTTPS tunnel when testing webhooks locally.
5. Place a test order and complete it with Paystack's test payment details. The browser callback and webhook both verify the transaction server-side before the order is marked paid.

Use test keys until the full checkout and webhook flow is verified. For production, replace the test secret with the live secret in your hosting provider's server environment and update the webhook URL to the production domain.

## Google sign-in

Authentication is handled by Supabase Auth using its Google provider:

1. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client with application type **Web application**.
2. Add the Supabase callback shown in **Supabase → Authentication → Providers → Google** to Google Cloud's authorized redirect URIs. It has the form `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Paste the Google client ID and secret into Supabase's Google provider settings and enable the provider.
4. In **Supabase → Authentication → URL Configuration**, set the site URL (for local development, `http://localhost:3000`) and allow `http://localhost:3000/auth/callback`. Add the production callback when deploying.

The account icon starts Google OAuth. Checkout is also available as a guest.

## Mobile app

The Expo / React Native app lives alongside the website in `../mobile/` and uses the same Supabase project, product catalog, Google Auth provider, and authenticated account.

1. Apply every SQL migration in timestamp order, including `20261004000000_shared_user_carts.sql`. This creates one row-level-secured `carts` row per signed-in user, links each `cart_items` row to that cart, preserves existing user carts, and adds both tables to Supabase Realtime.
2. In `../mobile/`, copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_SITE_URL`. Use the deployed website URL for product images and checkout; when testing on a phone against a local website, use your computer's LAN IP rather than `localhost`.
3. In Supabase **Authentication → URL Configuration → Redirect URLs**, add both:
   - `exp://**/--/auth/callback` for Expo Go. Expo Go generates a callback URL based on the current Metro host and port (for example, `exp://192.168.1.20:8081/--/auth/callback`). If Supabase does not accept the wildcard for your project, add the exact URL displayed by the mobile app's sign-in error.
   - `pelzessentials://auth/callback` for an installed app/development build.

   Keep Google enabled under **Authentication → Providers**. The Google Cloud OAuth client's authorized redirect URI must remain the Supabase callback URL `https://<project-ref>.supabase.co/auth/v1/callback`; the app deep link belongs in Supabase's Redirect URLs, not in Google Cloud. A separate Android/iOS Google client is not needed for this browser-based Supabase OAuth flow. Google briefly opens its sign-in page, then Supabase redirects back into the app. Native Google Sign-In would require native Google clients and an Expo development build, so it is not the quickest Expo Go setup.

4. Run `cd ../mobile`, `npm install`, and `npx expo start --tunnel --clear`. Keep the Expo CLI running while using Expo Go; use `--tunnel` when your phone is on mobile data or a different Wi-Fi network. Scan the newly displayed QR code after starting the tunnel. For a development build, install the build after changing native linking configuration. The app handles both foreground and cold-start OAuth callbacks and displays actionable callback errors.
5. Sign in with Google on both the website and app using the same account. Add, change quantity, and remove an item on either device and confirm the other device updates while both are online. The apps subscribe to that user's cart and cart-item changes. Existing website guest carts are merged into the account cart at sign-in.

The mobile app requires an authenticated account to read or modify the shared cart. Product browsing is public. The website continues to support guest carts and checkout.

## Confirmation emails

1. Verify the sending domain in Resend and add its DNS records.
2. Create a Resend API key, set `RESEND_API_KEY`, and set `RESEND_FROM_EMAIL` to an address on that verified domain, for example `Pelz Essentials <orders@yourdomain.com>`.
3. Checkout stores the order first, then sends the confirmation. If Resend is not configured or temporarily unavailable, the saved order still succeeds and the customer sees an on-screen confirmation.

## Project commands

```bash
npm run dev
npm run lint
npm run format
npm run format:check
npm run build
```

The storefront uses the category photos in `public/` for product cards, the hero carousel, and inspiration sections. Review product names and NGN prices against the actual inventory before launch. The supplied transparent brand mark is used in the header, footer, and sign-in page from `public/pelzlogo.png`.
