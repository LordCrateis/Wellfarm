# Replit Prototype Integration

The frontend generated in Replit is tracked under `prototype/replit` as a Git subtree from:

```text
https://github.com/LordCrateis/MeagerHomelyForm.git
```

This keeps the prototype inside the Wellfarm repository without nesting another `.git` directory. The `replit-prototype` remote is retained so later Replit changes can be synchronized deliberately.

## Current layout

```text
prototype/replit/
  artifacts/wellfarm/       React/Vite Wellfarm interface
  artifacts/api-server/     Express API skeleton
  artifacts/mockup-sandbox/ Replit design sandbox
  lib/api-spec/             OpenAPI source
  lib/api-client-react/     Generated React API client
  lib/api-zod/              Generated validation contracts
  lib/db/                    Drizzle database package
```

The production frontend currently lives at `prototype/replit/artifacts/wellfarm`. After the prototype audit, useful modules can be promoted into the root `apps`, `services`, and `packages` directories without losing the original Replit snapshot.

## Syncing future Replit changes

Fetch and inspect changes before pulling them into the subtree:

```text
git fetch replit-prototype main
git diff HEAD..replit-prototype/main
git subtree pull --prefix=prototype/replit replit-prototype main --squash
```

Local compatibility changes inside the subtree may require conflict resolution during a future pull.

## Local verification

The workspace uses pnpm:

```text
cd prototype/replit
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
```

The Replit Vite configuration expects `PORT` and `BASE_PATH`. Production builds should set `NODE_ENV=production`, `PORT=5173`, and `BASE_PATH=/`.

## Secrets

Store local API credentials in the root `.env` file. It is ignored by Git. Never put keys into Vite variables or client-side code unless the value is explicitly intended to be public.

Backend services should read secret values at runtime and expose only narrowly scoped endpoints to the frontend. Document variable names with empty values in the root `.env.example`.
