# Infrastructure

Deployment definitions will live here after the prototype stack is chosen.

A pilot-grade environment is expected to include:

- Application and inference containers
- Spatial relational database
- Encrypted object storage
- Queue and worker processes
- Cache
- Secrets manager
- Metrics, logs, traces, and alerting
- Separate development, test, and production configuration

Never commit cloud credentials, private keys, farmer images, or production exports. Use `.env.example` only to document required local variables.

