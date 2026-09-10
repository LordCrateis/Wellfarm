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

## Branded authentication email and delivery

Wellfarm's complete authentication-email set lives in `supabase/email-templates/templates.mjs`. It uses a compact W monogram, restrained fieldbook colours, concise security copy, no remote images, no promotional material and no tracking links. Signup and reauthentication messages use `{{ .Token }}`; link-based flows use only `{{ .ConfirmationURL }}`.

Supabase's default sender is for testing, not public delivery. Configure Resend SMTP with a sender domain you control and have verified in Resend. The repository can apply both SMTP and all templates in one operation:

1. Verify a sender domain in Resend and wait until its SPF and DKIM records show as verified. Add a DMARC record at the domain host as well. A free mailbox address such as Gmail cannot be used as the sending domain.
2. Create a restricted Resend API key for this project.
3. Create a Supabase personal access token at `https://supabase.com/dashboard/account/tokens`. This is different from the project service-role key.
4. Add `SUPABASE_ACCESS_TOKEN`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM` and `AUTH_EMAIL_SENDER_NAME` to the ignored root `.env`. Keep all of them server-only.
5. Run `npm run auth:test-email-templates`, then `npm run auth:configure-email`. The configuration command never prints either secret.
6. In Resend, disable click/open tracking for the authentication sender. Tracking can rewrite Supabase verification links and can hurt the security-email profile.
7. Create a fresh account using a real Gmail address, enter the OTP, and verify the Resend event says `Delivered`. Test Outlook as a second mailbox. Spam placement cannot be guaranteed by application code; it depends on domain authentication, sender reputation, complaint rate and mailbox-provider filtering.

The inbox avatar is not the website favicon. Gmail and other clients choose it from the sender identity and, where supported, BIMI. Set up BIMI only after SPF, DKIM and a DMARC enforcement policy are stable. The W monogram remains visible inside the email without loading an external image.

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
