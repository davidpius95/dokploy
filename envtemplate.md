# Environment Variables Template

This document lists every environment variable referenced in the repository, grouped by area, with a concise description of what it controls and when it is required.

## Core Application
- `DATABASE_URL`: Postgres connection string for all app services. Required.
- `NODE_ENV`: Environment mode (`development` or `production`). Required.
- `PORT`: HTTP port for the Dokploy web app (default: `3000`). Optional.
- `HOST`: Address to bind the web server (default: `0.0.0.0`). Optional.
- `IS_CLOUD`: Enable multi-tenant SaaS behavior when set to `true`. Optional.
- `PUBLIC_APP_URL`: Public base URL used in emails/links (e.g., `https://your-domain.com`). Required in cloud mode.
- `TURBOPACK`: Set to `1` to enable Next.js Turbopack in development. Optional.

## Auth & Social Login
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID. Required if GitHub login is enabled.
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret. Required if GitHub login is enabled.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID. Required if Google login is enabled.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret. Required if Google login is enabled.
- `USER_ADMIN_ID`: Internal user ID granted admin plugin privileges. Optional.

## Email & Notifications
- `SMTP_SERVER`: SMTP server hostname. Required in cloud mode for email flows.
- `SMTP_PORT`: SMTP port (e.g., `587`). Required in cloud mode for email flows.
- `SMTP_USERNAME`: SMTP username. Required in cloud mode for email flows.
- `SMTP_PASSWORD`: SMTP password or app password. Required in cloud mode for email flows.
- `SMTP_FROM_ADDRESS`: Sender email used in outbound messages. Required in cloud mode.
- `DISCORD_WEBHOOK_URL`: Discord webhook for notifications (welcome, etc.). Optional.

## Redis, Jobs, and Internal Services
- `REDIS_HOST`: Hostname for BullMQ worker used by Dokploy (production default: `dokploy-redis`). Optional; required if running the deployments worker from Dokploy.
- `REDIS_URL`: Redis connection URL for the separate API/Schedules services. Required if those services are used.
- `API_KEY`: Shared secret for internal job endpoints (`/deploy`, backups). Required if `SERVER_URL`/`JOBS_URL` integrations are used.
- `SERVER_URL`: Base URL of the deployments microservice (used to trigger deployments). Required if using that service.
- `JOBS_URL`: Base URL of the jobs/schedules microservice (used for backups/schedules). Required if using that service.

## Billing (Stripe)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (exposed to client). Required if billing is enabled.
- `STRIPE_SECRET_KEY`: Stripe secret key. Required if billing is enabled.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret for webhook handler. Required if using the webhook.
- `BASE_PRICE_MONTHLY_ID`: Stripe price ID for monthly plan(s). Required if subscriptions are offered.
- `BASE_ANNUAL_MONTHLY_ID`: Stripe price ID for annual plan(s). Required if subscriptions are offered.
- `STRIPE_PORTAL_CONFIGURATION_ID`: Optional Stripe Customer Portal configuration ID (`pc_...`). If set, the app uses it when creating portal sessions. Otherwise, ensure you enable and save a default Customer Portal configuration in the Stripe Dashboard (in the same mode: Test/Live).
- `SITE_URL`: Fallback base URL used in some Stripe flows (only read if `PUBLIC_APP_URL` is not set). Optional.

## Monitoring (Client-side)
- `NEXT_PUBLIC_METRICS_URL`: Public URL for the metrics backend. Optional.
- `NEXT_PUBLIC_METRICS_TOKEN`: Token for metrics queries. Optional.

## Traefik and Platform Setup
- `TRAEFIK_SSL_PORT`: Traefik HTTPS port (default: `443`). Optional.
- `TRAEFIK_PORT`: Traefik HTTP port (default: `80`). Optional.
- `TRAEFIK_HTTP3_PORT`: Traefik HTTP/3 UDP port (default: `443`). Optional.
- `TRAEFIK_VERSION`: Traefik image version tag (default: `3.1.2`). Optional.
- `RELEASE_TAG`: Docker tag for Dokploy components (default: `latest`). Optional.
- `DOKPLOY_CLOUD_IPS`: Comma-separated list of IPs used by cloud-only logic. Optional.

## Miscellaneous / Framework
- `VERCEL_URL`: Example email templates reference this in the shared package. Optional.
- `DATABASE_PATH`: Only logged in seed scripts; not required for normal operation. Optional.
- `PATH`: Inherited process PATH used for spawning commands. Do not set.
- `HOME`: Inherited user HOME directory (used for shells). Do not set.

## Per-Service Notes
- App `apps/dokploy` (Next + server)
  - Requires: `DATABASE_URL`, `NODE_ENV`, `PUBLIC_APP_URL` (cloud), SMTP_* (cloud), OAuth keys (if used)
  - Optional: `IS_CLOUD`, `PORT`, `HOST`, `REDIS_HOST`, Stripe vars (if billing), `API_KEY`/`SERVER_URL`/`JOBS_URL` if using microservices
- Service `apps/api`
  - Requires: `PORT`, `API_KEY`, `REDIS_URL` (plus `DATABASE_URL` via shared package)
- Service `apps/schedules`
  - Requires: `PORT`, `REDIS_URL` (plus `DATABASE_URL` via shared package)

## Quick Start Examples

### Cloud/SaaS
- `IS_CLOUD=true`
- `PUBLIC_APP_URL=https://your-domain.com`
- `DATABASE_URL=postgres://user:pass@db:5432/dokploy`
- `REDIS_URL=redis://:pass@redis:6379/0`
- `SMTP_SERVER=smtp.example.com`
- `SMTP_PORT=587`
- `SMTP_USERNAME=your_user`
- `SMTP_PASSWORD=your_pass`
- `SMTP_FROM_ADDRESS=no-reply@your-domain.com`
- `GITHUB_CLIENT_ID=...` / `GITHUB_CLIENT_SECRET=...` (optional)
- `GOOGLE_CLIENT_ID=...` / `GOOGLE_CLIENT_SECRET=...` (optional)
- Stripe (optional): `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BASE_PRICE_MONTHLY_ID`, `BASE_ANNUAL_MONTHLY_ID`

### Self-host (single-tenant)
- `IS_CLOUD=false`
- `DATABASE_URL=postgres://user:pass@localhost:5432/dokploy`
- `PORT=3000`, `HOST=0.0.0.0`
- SMTP/OAuth/Stripe variables are optional unless you enable those features

---


to run the app 
pnpm --filter=@dokploy/api run dev

then
pnpm run dokploy:dev