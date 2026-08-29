# Advisory Service

The advisory service turns approved structured evidence into readable guidance. It supports distinct templates for farmers and officials and can localize content into regional languages.

## Guardrails

- Ground responses only in supplied diagnosis, weather signal, policy, and approved knowledge.
- Include uncertainty and escalation conditions.
- Do not invent pesticide dosage, waiting periods, or legal claims.
- Prefer validated cached solutions when all matching criteria are satisfied.
- Store template version, evidence identifiers, language, and model metadata.
- Route high-risk or low-confidence outputs for human review.

## Prototype behavior

A real LLM call may operate on sample structured findings. The UI must label synthetic evidence and keep a deterministic fallback advisory for demonstrations without network access.

