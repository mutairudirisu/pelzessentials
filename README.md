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
2. Run the SQL files in `supabase/migrations/` in timestamp order. The first creates the catalog, order tables, row-level security, the atomic checkout function, and starter products. The second adds 19 more products across six categories. The third maps all products to the supplied local category photos, including stores that already ran the earlier seeds.
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
