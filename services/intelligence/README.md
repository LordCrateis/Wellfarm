# Collective Intelligence Service

This module owns geographic aggregation, weather/outbreak pattern discovery, the solutions cache, scheduled reporting, and the controlled retraining workflow.

## Planned jobs

- `aggregate_cases`: create privacy-safe district and cluster summaries.
- `detect_weather_signatures`: evaluate lagged weather windows against outbreak series.
- `refresh_solutions_cache`: promote expert-validated recurring patterns.
- `prepare_training_snapshot`: fingerprint changed verified records only.
- `evaluate_candidate_model`: compare candidates with the deployed baseline.
- `generate_monthly_report`: prepare official summaries and survey triggers.

## Explainability boundary

Outputs describe association, timing, sample size, and uncertainty. A cluster or anomaly is not presented as proof that weather caused an outbreak.

