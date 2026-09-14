# Wellfarm deployment

Wellfarm is split into two free-hostable services:

- GitHub Pages serves the Vite frontend.
- Render runs the Node API and ONNX Runtime at `api.wellfarm.shivambuilds.dev`.
- Supabase remains the durable auth, database and private scan-photo store.

## Before deploying

1. In GitHub repository settings, enable **Pages → GitHub Actions**.
2. Add a repository variable named `VITE_API_URL` containing
   `https://api.wellfarm.shivambuilds.dev` (without a trailing slash).
3. Create the Render web service from `render.yaml`.
4. Add every `sync: false` value in Render. Keep service-role keys and the
   private GitHub model token server-only.
5. Set `APP_ORIGIN`, `APP_ORIGINS`, `FRONTEND_URL` to the exact Pages URL. For a
   project Pages site this is normally `https://lordcrateis.github.io/Wellfarm`.
6. In Render, add the custom domain `api.wellfarm.shivambuilds.dev`. In
   Cloudflare DNS, create a CNAME for `api` pointing to the Render service
   hostname. Set `API_PUBLIC_URL` to `https://api.wellfarm.shivambuilds.dev`.
7. In Supabase Auth URL configuration, add the Pages URL and the API callback:
   `https://api.wellfarm.shivambuilds.dev/api/auth/callback`.
7. In Google OAuth and Turnstile, add the production origins/hostnames too.

The workflow builds with `/Wellfarm/` as its base path. If a custom domain is
attached later, change `BASE_PATH` to `/` and update the production URLs.

## Health and smoke checks

Render should report healthy when this responds with `{"status":"ok"}`:

```text
https://api.wellfarm.shivambuilds.dev/api/healthz
```

After the Pages deployment, test signup, OTP, Google sign-in, a scan upload,
weather, model analysis, history deletion, profile photo upload, regional
insights and the admin flow. A monitoring service should poll only `/api/healthz`.
