# Advisory Service

The advisory service turns structured model, crop, symptom, and weather evidence into readable guidance in the selected language.

The running implementation is exposed by the API server at `POST /api/advisory/explain`. It uses `gemini-2.5-flash-lite` by default when `GEMINI_API_KEY` is configured. `GEMINI_MODEL` can override the model name.

Gemini explains the ranked output; it does not inspect the uploaded image or replace the vision model. The request contains crop and candidate scores, optional farmer-observed symptoms, approximate affected area, nearby-plant status, weather measurements, and locale. It excludes the image, exact coordinates, farmer identity, and free-form notes.

## Safety rules

- Preserve confidence and uncertainty.
- Never upgrade a candidate label into a definitive diagnosis.
- Do not invent facts absent from structured evidence.
- Do not recommend pesticide brands or dosages.
- Suggest independent consultation with a qualified local agricultural professional only when appropriate.
- Never send, refer, or submit a user's case to another party.

A deterministic local explanation remains available when the optional language-model request is unavailable.

## Failure behaviour

Missing credentials, timeouts, provider errors, malformed structured output, and treatment-like language all produce the deterministic fallback response. The endpoint therefore remains usable without Gemini or network access, and returns the same response shape with `source: "fallback"` and `model: null`.
