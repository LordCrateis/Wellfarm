# Data Workspace

Only small, synthetic, non-sensitive fixtures belong in Git.

```text
samples/      Safe sample records used in development and tests
schemas/      Machine-readable draft contracts
raw/          Local source files; ignored by Git
processed/    Generated datasets; ignored by Git
private/      Sensitive local material; ignored by Git
```

## Dataset intake checklist

- Record source URL, owner, license, collection method, and date.
- Confirm permission for training, modification, evaluation, and publication.
- Check crop, disease, geography, season, device, and class balance.
- Remove direct identifiers and reduce location precision when possible.
- Prevent near-duplicate images from crossing train/test boundaries.
- Version transformations and retain a reproducible data manifest.
