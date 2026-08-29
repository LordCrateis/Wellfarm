# AgriSentinel Product Requirements

## Project context

- **Problem statement:** SIH26131
- **Organization:** Government of Maharashtra — Maharashtra State Innovation Society
- **Category:** Software
- **Theme:** Agriculture, FoodTech & Rural Development
- **Current stage:** Smart India Hackathon Round 1 — idea and architecture proposal

## Problem

Farmers often discover diseases and pest infestations after visible crop damage. Limited agricultural-extension capacity can make diagnosis late, inconsistent, and disconnected from nearby outbreaks. The result can be incorrect treatment, excessive pesticide use, increased cultivation costs, residue risk, yield loss, and weak regional visibility for government teams.

## Proposed solution

AgriSentinel is a farmer- and official-facing platform that connects individual crop scans to regional intelligence. Farmers photograph symptoms and receive simple, localized guidance. Anonymized reports are grouped geographically, correlated with weather, and summarized for officials. Moderate- and high-risk cases can be routed to nearby laboratories for confirmation, creating a feedback loop between farmers, officials, and labs.

## Users

### Farmers

- Submit crop photos and basic field context.
- Receive probable disease or pest classifications.
- Read or listen to advisories in a regional language.
- Contribute scans to an anonymized community dataset.

### Agriculture officials

- View state- and district-level severity on a map.
- Inspect crop, issue, report volume, and severity summaries.
- Receive data-backed recommended actions.
- Generate monthly reports and plan field surveys.

### Diagnostic laboratories and extension teams

- Receive geographically appropriate moderate- and high-risk referrals.
- Record field or laboratory findings in the same system.
- Feed verified outcomes back into future model improvement.

## Product capabilities

1. **Photo diagnosis:** a limited computer-vision model identifies supported crop diseases and pests.
2. **Localized advice:** an LLM converts structured findings into plain-language guidance for farmers and officials.
3. **Regional aggregation:** anonymized scans form district or local clusters.
4. **Incremental learning design:** unchanged records are fingerprinted so scheduled retraining avoids redundant work.
5. **Weather correlation:** clustering or anomaly detection surfaces weather conditions that precede outbreaks.
6. **Solutions cache:** validated weather-pattern, outcome, and advisory chains can be reused before full inference.
7. **Officials' dashboard:** an India → state → district map uses a green/yellow/red severity scale.
8. **Reporting:** monthly summaries become formal reports and survey triggers.
9. **Lab routing:** moderate- and high-risk cases are assigned to the nearest appropriate lab.
10. **Verification loop:** field and lab results become labeled evidence for later model iterations.

## Round 1 scope

| Capability | Round 1 delivery |
| --- | --- |
| Farmer photo upload and disease detection | Partial working prototype with limited classes |
| Officials' severity dashboard | Partial working prototype using simulated data |
| Collective retraining and caching | Architecture and mocked retraining cycle |
| Weather correlation | Architecture and simulated example output |
| LLM advice | Real call using sample or simulated structured input |
| Solutions cache | Conceptual flow and a mocked cache hit |
| Lab routing | Architecture only |
| Shared field-survey workflow | Architecture only |

The demo must distinguish working behavior from simulated or planned behavior. Visible interactions should be real even when their underlying data is synthetic.

## Success signals for the prototype

- A supported image produces a diagnosis result and understandable localized advice.
- Simulated district data renders correctly with three severity levels.
- A judge can follow one case from scan to regional aggregation, official action, and lab verification.
- Each demo screen clearly labels simulated data and model confidence.
- The team can explain how caching, retraining, privacy, and validation would work in production.

## Risks and open questions

- Identify legally usable crop image, weather, outbreak, and laboratory datasets.
- Define a specific explainable unsupervised method rather than claiming generic AI correlation.
- Establish consent, anonymization, retention, and precise-location access rules.
- Treat generated advice as decision support, not a replacement for agricultural experts.
- Validate pesticide-related guidance against official recommendations before release.
- Keep Round 1 claims aligned with what is genuinely implemented.

