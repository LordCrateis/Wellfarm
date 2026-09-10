# Accounts

Production authentication uses Supabase Auth. Register or log in at `/login`;
email verification, Google sign-in, password hashing, and identity ownership are
handled by Supabase. The Wellfarm API stores only opaque application-session
hashes locally and validates the associated Supabase access token on requests.

When `SUPABASE_PROJECT_MODE=dedicated`, scan records and saved model results live
in the private `wellfarm_scans` Postgres table and crop photos live in the private
`wellfarm-scan-images` Storage bucket. Both are accessed only by the trusted API
server. Account deletion removes the Auth identity, cascades its scan records,
and deletes its Storage objects. Local-auth development retains the SQLite and
local-upload fallback.

Set `APP_ORIGIN` to the browser application's exact origin when deploying.
Production requires HTTPS for Secure session cookies. Registration/login are
rate limited per API process. Supabase and the configured SMTP provider handle
verification and password-recovery delivery.

The migration leaves pre-account scans unassigned and inaccessible through account
APIs. It never assigns another person's records to a newly registered account.
Legacy browser profile storage is cleared on application load. Existing unassigned
scan files remain on disk until an explicit migration or deletion is requested.

Feedback is retained locally with the account and cascades on account deletion.
No feedback is sent to an external service.

Build the API and run `node services/vision/scripts/test_scan_integration.mjs`
for an isolated test of registration, sessions, cross-account isolation, feedback,
real model inference, wrong-password deletion rejection and full account deletion.
