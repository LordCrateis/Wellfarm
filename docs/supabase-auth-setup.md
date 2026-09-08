# Wellfarm authentication setup

## Current status

The admin dashboard, private conversations and retained scan history run against the existing local database. Supabase Auth integration is implemented but not activated or live-tested. Creating the Wellfarm project was blocked by the account's two-active-free-project limit. Do not upgrade or pause another project without the owner's approval.

## Activate after a free project slot is available

1. Create Wellfarm in the Shivam Tamboli organization, using a free project. Keep existing project data untouched.
2. Put the project URL, publishable key and server-only service-role key into the root `.env` using the variable names in `.env.example`. Never put the service-role key in frontend variables or commit it.
3. Enable email confirmation in Supabase Auth. In the Confirm signup email template, include `{{ .Token }}` so the user can enter the emailed OTP in Wellfarm. The built-in mail sender is restricted; configure an appropriate no-cost SMTP provider before inviting arbitrary email addresses, and verify its current sending limits.
4. Create a free Cloudflare Turnstile widget for the app's hostname. Set `TURNSTILE_SITE_KEY` in `.env`, and set its **secret** in Supabase Auth's CAPTCHA settings with Turnstile selected. Do not use test CAPTCHA keys on a public deployment.
5. Configure Google's OAuth client and enable the Google provider in Supabase. Add Supabase's displayed callback URL to the Google client's authorized redirect URIs. Add `http://localhost:5173/api/auth/callback` (and the eventual HTTPS production callback) to Supabase's redirect allowlist. Set `GOOGLE_AUTH_ENABLED=true` only after configuration is complete.
6. Set `APP_ORIGIN` to the exact app origin, `AUTH_PROVIDER=supabase`, and `WELLFARM_ADMIN_EMAIL=shivamrtamboli62@gmail.com`. Restart `npm run dev`.
7. Sign up and verify the administrator's email, or use Google with that verified email. Only the server-configured, verified email is eligible for the initial admin role; public profile fields cannot grant access.

Supabase manages password hashing in Supabase mode. Local fallback accounts use salted scrypt hashes. Existing local accounts are **not automatically linked by email** to Supabase identities: an explicit, ownership-verified migration is required to preserve their records. Do not delete them as a migration shortcut. Auth switching is not a migration of the local application database or image files into Supabase.

Sessions use opaque HttpOnly cookies; Supabase access tokens stay server-side. Sessions currently expire after at most one hour and require another login (automatic refresh is not implemented). Set `NODE_ENV=production` behind HTTPS so cookies are Secure. Protect and back up the server database, which contains session credentials.

## Data behavior

- Farmer history removal hides scans from all farmer scan endpoints. Administrators can still see the retained images and cached reports. The confirmation dialog and sign-in page disclose this.
- Account deletion permanently removes the account's local scans, retained scans, images, reports, feedback and conversations, and deletes its Supabase identity when configured. This is different from history removal.
- State and district are self-reported profile fields, not verified GPS claims.
- Conversations are private per account, stored locally and polled every five seconds. They do not send email, SMS or lab cases.

## Verification before public use

Run both workspace typechecks/builds and `node services/vision/scripts/test_scan_integration.mjs` after building the API. The integration script uses an isolated temporary database and real local model inference; it covers admin authorization, scan retention, conversations and permanent account deletion. It does not verify a live Supabase project.

Manually verify signup OTP delivery, incorrect/expired codes, CAPTCHA rejection, Google callback/PKCE, logout, expired sessions, administrator access and Supabase account deletion before exposing the site publicly. The project is not ready for public authentication until those checks pass.
