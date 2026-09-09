# Wellfarm authentication setup

## Current status

The selected Supabase project is now dedicated to Wellfarm authentication. Its URL and publishable key are saved in the ignored root `.env`; `SUPABASE_PROJECT_MODE=dedicated` enables server-side session revocation and Auth user deletion.

## Dedicated-project safety

- Keep `SUPABASE_PROJECT_MODE=dedicated` and store `SUPABASE_SERVICE_ROLE_KEY` only in the server environment. Never expose or commit it.
- Wellfarm account deletion removes the Supabase Auth user together with local sessions, profile data, scans, reports, feedback and conversations.
- Wellfarm admins see and manage only accounts that have entered Wellfarm; admin roles remain server-controlled and cannot be granted through profile metadata.
- Keep `http://localhost:5173/api/auth/callback` and the eventual production callback in the redirect allowlist.
- The Confirm signup template must include `{{ .Token }}` for Wellfarm's numeric OTP screen.
- `node services/vision/scripts/test_auth_project_policy.mjs` verifies that only an explicit `dedicated` setting enables privileged Auth mutations.

The application database, scan files and conversations remain local. Selecting a Supabase project for Auth does not migrate them to Supabase Postgres or Storage.

## Email OTP template

In Supabase Dashboard, open **Authentication → Email Templates → Confirm signup**. Preserve the existing link and add a clearly labelled code using the `{{ .Token }}` variable, for example:

```html
<p>Your Wellfarm verification code is:</p>
<h2>{{ .Token }}</h2>
```

Save the template, restart `npm run dev`, and create a fresh test account with an email address that has not already been confirmed. The signup screen will request that numeric code, verify it with Supabase, and then open the farmer-profile setup page. The resend control uses Supabase's signup resend endpoint and is subject to Supabase's email rate limits.

## Dedicated project setup

1. Create Wellfarm in the Shivam Tamboli organization, using a free project. Keep existing project data untouched.
2. Put the project URL, publishable key and server-only service-role key into the root `.env` using the variable names in `.env.example`. Never put the service-role key in frontend variables or commit it.
3. Enable email confirmation in Supabase Auth. In the Confirm signup email template, include `{{ .Token }}` so the user can enter the emailed OTP in Wellfarm. The built-in mail sender is restricted; configure an appropriate no-cost SMTP provider before inviting arbitrary email addresses, and verify its current sending limits.
4. Create a free Cloudflare Turnstile widget for the app's hostname. Set `TURNSTILE_SITE_KEY` in `.env`, and set its **secret** in Supabase Auth's CAPTCHA settings with Turnstile selected. Do not use test CAPTCHA keys on a public deployment.
5. Configure Google's OAuth client and enable the Google provider in Supabase. Add Supabase's displayed callback URL to the Google client's authorized redirect URIs. Add `http://localhost:5173/api/auth/callback` (and the eventual HTTPS production callback) to Supabase's redirect allowlist. Set `GOOGLE_AUTH_ENABLED=true` only after configuration is complete.
6. Set `SUPABASE_PROJECT_MODE=dedicated`. Set `APP_ORIGIN` to the exact app origin, `AUTH_PROVIDER=supabase`, and `WELLFARM_ADMIN_EMAIL` to the verified administrator email. Restart `npm run dev`.
7. Sign up and verify the administrator's email, or use Google with that verified email. Only the server-configured, verified email is eligible for the initial admin role; public profile fields cannot grant access.

Supabase manages password hashing in Supabase mode. Local fallback accounts use salted scrypt hashes. Existing local accounts are **not automatically linked by email** to Supabase identities: an explicit, ownership-verified migration is required to preserve their records. Do not delete them as a migration shortcut. Auth switching is not a migration of the local application database or image files into Supabase.

Sessions use opaque HttpOnly cookies; Supabase access tokens stay server-side. Sessions currently expire after at most one hour and require another login (automatic refresh is not implemented). Set `NODE_ENV=production` behind HTTPS so cookies are Secure. Protect and back up the server database, which contains session credentials.

## Data behavior

- Farmer history removal hides scans from all farmer scan endpoints. Administrators can still see the retained images and cached reports. The confirmation dialog and sign-in page disclose this.
- Account deletion permanently removes the Supabase identity plus local scans, retained scans, images, reports, feedback and conversations. This is different from history removal.
- State and district are self-reported profile fields, not verified GPS claims.
- Conversations are private per account, stored locally and polled every five seconds. They do not send email, SMS or lab cases.

## Verification before public use

Run both workspace typechecks/builds and `node services/vision/scripts/test_scan_integration.mjs` after building the API. The integration script uses an isolated temporary database and real local model inference; it covers admin authorization, scan retention, conversations and permanent account deletion. It does not verify a live Supabase project.

Manually verify signup OTP delivery, incorrect/expired codes, CAPTCHA rejection, Google callback/PKCE, logout, expired sessions, administrator access and Supabase account deletion before exposing the site publicly. The project is not ready for public authentication until those checks pass.
