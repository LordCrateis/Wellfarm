# Wellfarm authentication setup

## Current status

The user selected the existing `indra-studio` project (`wgnbgezilvygnmubwyny`) for shared authentication. Its URL and publishable key are saved in the ignored root `.env`. Google and email authentication are enabled remotely. Wellfarm still uses local authentication until dashboard redirect/CAPTCHA/email configuration and account migration are verified. No Indra tables, policies, users or settings have been changed.

## Shared Indra project safety

- Keep `SUPABASE_PROJECT_MODE=shared`. This is also the code's safe default; Indra's hostname is protected even if the mode is mistakenly set to dedicated.
- Wellfarm account deletion removes only Wellfarm application data and local sessions. It never deletes the shared Supabase identity or globally signs out Indra sessions. Users are informed in the deletion dialog. Signing into Wellfarm again can create a new empty Wellfarm profile.
- Wellfarm admins see only Wellfarm accounts, not every identity in Indra's Auth user pool. Admin roles remain local to Wellfarm.
- No service-role key is needed for this shared-auth arrangement. Do not copy Indra's privileged key into Wellfarm unnecessarily.
- Preserve Indra's Site URL. Add `http://localhost:5173/api/auth/callback` to the existing redirect allowlist without replacing its other entries. Dashboard sign-in is currently needed to inspect and make that additive change.
- Do not enable project-wide CAPTCHA or replace email templates just for Wellfarm without checking Indra's compatibility. These settings affect both apps. Email OTP is not yet verified. New free projects using default SMTP cannot customize email templates under the June 2026 change; a compatible custom SMTP setup may be necessary.
- Run `node services/vision/scripts/test_auth_project_policy.mjs` and, after building the API, `node services/vision/scripts/test_shared_auth_deletion.mjs`. The latter mocks only Supabase to prove Wellfarm deletion makes no remote identity mutation.

The application database, scan files and conversations remain local. Selecting Indra for Auth does not migrate them to Supabase Postgres or Storage.

## Reference: dedicated project setup (not the selected shared configuration)

1. Create Wellfarm in the Shivam Tamboli organization, using a free project. Keep existing project data untouched.
2. Put the project URL, publishable key and server-only service-role key into the root `.env` using the variable names in `.env.example`. Never put the service-role key in frontend variables or commit it.
3. Enable email confirmation in Supabase Auth. In the Confirm signup email template, include `{{ .Token }}` so the user can enter the emailed OTP in Wellfarm. The built-in mail sender is restricted; configure an appropriate no-cost SMTP provider before inviting arbitrary email addresses, and verify its current sending limits.
4. Create a free Cloudflare Turnstile widget for the app's hostname. Set `TURNSTILE_SITE_KEY` in `.env`, and set its **secret** in Supabase Auth's CAPTCHA settings with Turnstile selected. Do not use test CAPTCHA keys on a public deployment.
5. Configure Google's OAuth client and enable the Google provider in Supabase. Add Supabase's displayed callback URL to the Google client's authorized redirect URIs. Add `http://localhost:5173/api/auth/callback` (and the eventual HTTPS production callback) to Supabase's redirect allowlist. Set `GOOGLE_AUTH_ENABLED=true` only after configuration is complete.
6. For a genuinely dedicated project only, set `SUPABASE_PROJECT_MODE=dedicated`. Set `APP_ORIGIN` to the exact app origin, `AUTH_PROVIDER=supabase`, and `WELLFARM_ADMIN_EMAIL=shivamrtamboli62@gmail.com`. Restart `npm run dev`.
7. Sign up and verify the administrator's email, or use Google with that verified email. Only the server-configured, verified email is eligible for the initial admin role; public profile fields cannot grant access.

Supabase manages password hashing in Supabase mode. Local fallback accounts use salted scrypt hashes. Existing local accounts are **not automatically linked by email** to Supabase identities: an explicit, ownership-verified migration is required to preserve their records. Do not delete them as a migration shortcut. Auth switching is not a migration of the local application database or image files into Supabase.

Sessions use opaque HttpOnly cookies; Supabase access tokens stay server-side. Sessions currently expire after at most one hour and require another login (automatic refresh is not implemented). Set `NODE_ENV=production` behind HTTPS so cookies are Secure. Protect and back up the server database, which contains session credentials.

## Data behavior

- Farmer history removal hides scans from all farmer scan endpoints. Administrators can still see the retained images and cached reports. The confirmation dialog and sign-in page disclose this.
- Account deletion permanently removes the account's local scans, retained scans, images, reports, feedback and conversations. Only dedicated-project mode also deletes its Supabase identity; shared Indra identities are preserved. This is different from history removal.
- State and district are self-reported profile fields, not verified GPS claims.
- Conversations are private per account, stored locally and polled every five seconds. They do not send email, SMS or lab cases.

## Verification before public use

Run both workspace typechecks/builds and `node services/vision/scripts/test_scan_integration.mjs` after building the API. The integration script uses an isolated temporary database and real local model inference; it covers admin authorization, scan retention, conversations and permanent account deletion. It does not verify a live Supabase project.

Manually verify signup OTP delivery, incorrect/expired codes, CAPTCHA rejection, Google callback/PKCE, logout, expired sessions, administrator access and Supabase account deletion before exposing the site publicly. The project is not ready for public authentication until those checks pass.
