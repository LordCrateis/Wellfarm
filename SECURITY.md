# Security and Responsible Disclosure

AgriSentinel is an early prototype and must not be used as the sole basis for crop-treatment decisions.

## Reporting a vulnerability

Do not open a public issue containing an exploit, credential, precise farmer location, private image, or other sensitive evidence. Contact the repository maintainers privately and provide the smallest reproduction necessary. Maintainers should replace this paragraph with a monitored security contact before public distribution.

## Sensitive material that must not enter Git

- API keys, passwords, access tokens, certificates, or private keys
- Identifiable farmer, official, or laboratory records
- Precise farm coordinates unless explicitly approved and protected
- Production exports, raw private images, or proprietary datasets
- Unlicensed model weights or data

Use synthetic records for development and demonstration. Revoke any exposed credential immediately and remove it from both the current tree and repository history.

