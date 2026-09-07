# Accounts

This installation uses SQLite-backed accounts, not Supabase. Register or log in
at `/login`. Passwords use random salts and scrypt; opaque session tokens are
stored as SHA-256 hashes. Sessions expire after seven days. Logout revokes the
current session. Password-confirmed account deletion removes all account sessions,
profile data, feedback, owned scans and their uploaded photos/model sidecars.

Set `APP_ORIGIN` to the browser application's exact origin when deploying.
Production requires HTTPS for Secure session cookies. Registration/login are
rate limited per API process. Email verification, password recovery, distributed
rate limiting and email delivery are not implemented.

The migration leaves pre-account scans unassigned and inaccessible through account
APIs. It never assigns another person's records to a newly registered account.
Legacy browser profile storage is cleared on application load. Existing unassigned
scan files remain on disk until an explicit migration or deletion is requested.

Feedback is retained locally with the account and cascades on account deletion.
No feedback is sent to an external service.

Build the API and run `node services/vision/scripts/test_scan_integration.mjs`
for an isolated test of registration, sessions, cross-account isolation, feedback,
real model inference, wrong-password deletion rejection and full account deletion.
