# Wellfarm Web Application

The React application contains the public site, farmer fieldbook, scan journey, regional insights, and data-transparency pages.

## Routes

- `/` — public home
- `/workspaces` — choose fieldbook or regional insights
- `/farmer`, `/farmer/scan`, `/farmer/history` — personal crop-health tools
- `/insights`, `/insights/intelligence`, `/insights/district/:id` — privacy-reduced regional analysis
- `/transparency` — provenance, privacy, and model limitations

The app has no laboratory, referral, government-operations, or third-party case-submission routes.

## Data boundaries

Open-Meteo and browser geolocation provide live context when available. Regional fixtures are identified as sample data. Crop analysis must be identified as model output, and saved scan history comes from the local Wellfarm API.
