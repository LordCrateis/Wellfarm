# Site translations

The site uses English source messages plus checked-in catalogs for Hindi, Marathi,
Bengali, Telugu, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Odia and Assamese.
Static UI translation works offline and makes no runtime language-model requests.

`TranslationProvider` keeps the selected locale in React context. `LocalizedContent`
translates presentation strings and accessibility text while retaining form values,
callbacks, React keys and refs. Add this boundary to newly introduced page components.
Use `useTranslation().t` for imperative UI such as Leaflet tooltips. User-authored
content should be marked `translate="no"`. Provider map tiles and unknown place names
retain their original text. Generated advisory prose is requested in the selected
locale; changing language refreshes that prose without resaving a scan.

From the repository root:

```powershell
node platform/replit/artifacts/wellfarm/scripts/localize-source.mjs --extract
node platform/replit/artifacts/wellfarm/scripts/generate-translations.mjs
node platform/replit/artifacts/wellfarm/scripts/check-translations.mjs
```

The generator uses the existing `GEMINI_API_KEY` only at build time and sends only
the source UI messages. It resumes completed catalogs, validates message counts and
interpolation placeholders, and applies a crop terminology glossary. Pass a locale
such as `ta` to regenerate just that language; add `--refresh` for a complete rewrite.
The initial catalogs are machine translations and still benefit from native-speaker
review. Edit catalog values directly to improve wording, preserving numbered slots.

The tests cover catalog completeness, interpolation, translated accessibility labels,
unchanged dropdown/API values, and back destinations for directly opened routes.
