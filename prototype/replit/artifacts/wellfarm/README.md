# Wellfarm

Wellfarm is a frontend-first Smart India Hackathon demonstration of a shared crop-health intelligence loop: a farmer scan becomes an approximate district signal, a referral, a field verification event and a future learning record.

## Run

```bash
PORT=5173 BASE_PATH=/ npm run dev
```

The workspace Vite setup may provide `PORT` and `BASE_PATH` automatically. Production builds use `PORT=5173 BASE_PATH=/ npm run build`.

## Routes

- `/` public home
- `/roles` role entry
- `/farmer`, `/farmer/scan`, `/farmer/history`, `/farmer/referral`
- `/officials`, `/officials/intelligence`, `/officials/district/cuttack`, `/officials/cases`, `/officials/referrals`, `/officials/report`
- `/lab`, `/lab/case/WF-24041`
- `/demo` guided judge journey
- `/transparency` provenance and privacy notes

## Architecture

`src/data/mock.ts` contains deterministic typed fixtures (states and UTs, 40 scans, districts, weather, referrals, centres, reports, retraining and cache entries). `src/services/adapters.ts` contains replaceable weather, geolocation and analysis adapters. Pages and reusable status/shell components live under `src/pages` and `src/components`; locale structures are in `src/i18n`.

The weather adapter tries Open-Meteo when the browser is online and a location is available, then deliberately falls back to deterministic `Demo weather`. No secrets are used in the browser. Crop analysis, referrals, reports, retraining and solution-cache timings are honest prototype fixtures.

## Replacing mock adapters

Keep the service contracts in `src/services/adapters.ts`, replace the implementation with calls to a server-side API, validate returned structured data, and keep provenance labels in the UI. A production map adapter can replace the intentionally labeled schematic map once licensed India geometry is available.

## Provenance

The app uses visible badges for `Live weather`, `Prototype model`, `Demo outbreak data`, `Simulated retraining`, `Sample referral`, `Verified field result`, and `Cached validated solution`. The transparency route explains their boundaries. Exact farm coordinates are not rendered in official views.

## Prototype limitations

This is a deterministic Round 1 demo. It does not claim diagnosis, laboratory certification, chemical dosage or official government endorsement. The upload journey validates file type through the browser control and uses a fixture result; production would persist the image through an authenticated object-storage service.