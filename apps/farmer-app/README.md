# Farmer App

The farmer app is the low-literacy, multilingual entry point for crop scanning and field guidance. It may be implemented as a responsive web app first, then packaged or rebuilt for mobile after the Round 1 prototype.

## Round 1 journey

1. Choose a language.
2. Capture or upload a crop photo.
3. Select the crop and provide optional symptom details.
4. Confirm consent and approximate location sharing.
5. View the probable issue, confidence, and simple next steps.
6. Hear the advisory read aloud where text-to-speech is available.
7. Submit the anonymized scan as a community contribution.

## Required screens

- Welcome, language, and role selection
- Scan guidance and image capture
- Crop and field-context form
- Analysis progress
- Diagnosis, uncertainty, and localized advice
- Scan history and referral status
- Consent, privacy, and help

## Accessibility requirements

- Large touch targets and high-contrast status indicators
- Icons paired with text; color is never the only signal
- Short sentences and regional-language audio support
- Clear offline, upload, and retry states
- No pesticide instruction without validated source and safety wording

## Round 1 data boundary

The image classifier may support only a small crop/disease set. Unsupported images must return an honest “unable to identify” state. Sample advisories and referrals must display a “Demo data” label.

