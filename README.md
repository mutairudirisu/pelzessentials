# Pelz Essentials

The website and Expo mobile app are separate applications in this repository:

- [`web/`](./web/) — Next.js storefront and server-side checkout.
- [`mobile/`](./mobile/) — React Native app built with Expo.

Each application has its own `package.json`, lockfile, dependencies, environment file, and run commands. They share the configured Supabase project for the product catalog, authentication, and signed-in cart synchronization. Supabase migrations are in [`web/supabase/migrations/`](./web/supabase/migrations/).

## Run the website

```powershell
Set-Location web
npm install
npm run dev
```

Configure the website's local environment in `web/.env.local`. See the [website README](./web/README.md) for Supabase, checkout, and Google sign-in setup.

## Run the mobile app

In a separate terminal:

```powershell
Set-Location mobile
Copy-Item .env.example .env
npm install
npx expo start --tunnel --clear
```

Set the Supabase project URL and anon key, and the website URL, in `mobile/.env`. For a website running on your development machine, use its LAN IP as the mobile app's website URL when testing from a phone.
Keep the Expo CLI running while using Expo Go. Use `--tunnel` when the phone is on mobile data or a different Wi-Fi network; use the default LAN connection only when both devices share the same local network.

The mobile app bundles the same logo and product photos used by the website, so the current catalog images display without needing the website server to be running. When changing product photos, update the corresponding mobile image in `mobile/assets/products/` and its entry in `mobile/App.tsx`.

Apply all migrations in `web/supabase/migrations/` before testing shared carts. The [website README](./web/README.md#mobile-app) documents Expo Go and installed-app Google redirect configuration, and the cross-device login/cart test steps.

## Build and submit the Android app

1. Configure `mobile/.env` with the Supabase project URL, anon key, and deployed website URL. Apply all Supabase migrations and allow `pelzessentials://auth/callback` under **Authentication → URL Configuration → Redirect URLs**.
2. From the project root, build an installable APK with Expo Application Services:

   ```powershell
   Set-Location mobile
   npx eas-cli login
   npx eas-cli build --platform android --profile preview
   ```

   The `preview` profile in `mobile/eas.json` produces an APK. EAS needs an Expo account and the first build may ask to link the project. Confirm that the public Supabase URL and anon key are configured in the EAS build environment before building; do not add a service-role key to the mobile app.

   A self-contained local release APK is available at `mobile/dist/Pelz-Essentials-Android.apk`. It is signed with the local Android debug key for device installation and review; use EAS for a separately managed submission/release signing key. A Gradle `debug` APK is not standalone because it requires Metro.

3. Install and test the APK on an Android device. Sign in to the website and app with the same Google account, then add, change, and remove a cart item on both sides.
4. Upload the APK to Google Drive or another accessible file-sharing service and enable download access. Submit that download link, this repository's source link, and a single continuous screen recording showing the website sign-in, mobile sign-in, and cart synchronization.
