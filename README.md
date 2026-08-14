# Maintenance Car API

Multi-user API for tracking vehicles, maintenance schedules, service history,
overdue work, and monthly or yearly costs. The backend uses NestJS, PostgreSQL,
Prisma, Redis, and Docker.

## MVP scope

Each user can:

- create an account with email and password;
- manage multiple vehicles and odometer readings;
- track maintenance by calendar interval, mileage interval, or both;
- see each due reason independently;
- record completed services, workshop, date, mileage, notes, and cost;
- use basic maintenance templates and customize them per vehicle;
- view monthly and yearly maintenance costs;
- receive Web Push reminders in a future frontend.

The MVP does not include a frontend, spreadsheet import, insurance, taxes, fuel,
manufacturer-specific maintenance catalogs, or file uploads. A storage contract
will prepare future S3-compatible attachments without requiring S3 now.

## Technical decisions

- Node.js 22 LTS, NestJS, strict TypeScript, and versioned REST endpoints;
- PostgreSQL with Prisma and versioned migrations;
- Redis and BullMQ for scheduled work and notifications;
- short-lived JWT access tokens and rotating, revocable refresh tokens;
- Argon2id password hashing;
- Swagger/OpenAPI;
- Jest, Supertest, ESLint, and Prettier;
- Docker Compose for development and initial VPS deployment.

The application starts as a modular monolith:

```text
src/
  auth/                   registration, login, and session renewal
  users/                  account and user preferences
  vehicles/               vehicles and odometer readings
  maintenance-templates/  application-managed starter catalog
  maintenance-plans/      customizable rules per vehicle
  maintenance-records/    completed service history
  expenses/               maintenance-only expenses
  reminders/              due-status calculations and scheduling
  notifications/          push subscriptions and deliveries
  reports/                monthly and yearly aggregation
  storage/                future attachment contract
  health/                 liveness and readiness
```

## Maintenance status rules

Calendar and mileage are always evaluated separately:

- calendar due date: `lastPerformedAt + intervalMonths`;
- mileage threshold: `lastPerformedOdometerKm + intervalKm`.

Each dimension returns `NOT_CONFIGURED`, `UNKNOWN`, `ON_TRACK`, `DUE_SOON`, or
`OVERDUE`. The overall status uses the most urgent result without hiding either
dimension. Dates use the user's timezone; timestamps are stored in UTC.

Example:

```json
{
  "overallStatus": "OVERDUE",
  "timeStatus": {
    "status": "OVERDUE",
    "dueDate": "2026-08-01",
    "overdueByDays": 12
  },
  "odometerStatus": {
    "status": "DUE_SOON",
    "dueAtKm": 80000,
    "remainingKm": 350
  },
  "reasons": ["Overdue by 12 day(s)", "350 km remaining before the limit"]
}
```

## Local setup

```bash
cp .env.example .env
docker compose up -d postgres redis
npm ci
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

The project PostgreSQL instance is published on `localhost:5433` to avoid
conflicts with local installations that commonly use `5432`.

### Interactive Swagger

Open `http://localhost:3000/docs` after starting the API:

1. Run `POST /api/v1/auth/register` or `POST /api/v1/auth/login`.
2. Copy the returned `accessToken`.
3. Select **Authorize**, paste only the access token, and confirm.
4. Exercise the protected user, vehicle, maintenance, and odometer endpoints.

Authorization persists across page reloads. The OpenAPI JSON document is at
`http://localhost:3000/docs/openapi.json` and can be imported into Postman or
Insomnia. Refresh tokens belong only in `/auth/refresh` and `/auth/logout`.

## Quality checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm test -- --runInBand
DATABASE_URL='postgresql://maintenance_car:maintenance_car@localhost:5433/maintenance_car_test?schema=public' npm run test:e2e -- --runInBand
npm run build
```

The testing pyramid consists of many colocated unit tests (`*.spec.ts`), focused
PostgreSQL integration coverage for constraints and transactions, and a small
set of HTTP journeys under `test/`.

## Background worker and notifications

Phase 4 runs notification generation and delivery outside the HTTP process. The
worker schedules scans, records notification work, consumes the Redis-backed
queues, and delivers Web Push messages. PostgreSQL remains the source of truth for
subscriptions, notification history, and deduplication.

For local development, configure `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and
`VAPID_PRIVATE_KEY` in `.env`. Keep the private key out of source control and
use a distinct VAPID key pair for each deployment.

Generate a development key pair with:

```bash
npx web-push generate-vapid-keys
```

`WEB_PUSH_ALLOWED_HOSTS` restricts delivery to trusted browser push services.
Add a provider deliberately instead of accepting arbitrary notification URLs.

Start the API, PostgreSQL, Redis, and worker together with:

```bash
docker compose --profile worker up --build
```

To run only the worker after its dependencies are already available:

```bash
npm run start:worker:dev
```

The worker has no HTTP port. Queue and delivery failures are recorded by the
application and must be monitored through logs and notification delivery data.
Production readiness checks are part of Phase 5 observability work.

## Security and operations

- request DTOs reject unknown fields and validate all input;
- authentication endpoints have stricter rate limits;
- access and refresh secrets must be long and independent;
- refresh tokens are stored only as Argon2 hashes and rotated by family;
- every owned resource is filtered by the authenticated `userId`;
- compound database constraints reinforce multi-user isolation;
- money uses decimal columns and decimal strings, never floating point;
- multi-entity writes use serializable transactions with conflict retries;
- application containers run as an unprivileged user;
- migrations run as a controlled deployment step;
- logs go to stdout/stderr and must not contain passwords, tokens, or full
  sensitive identifiers;
- PostgreSQL backups and restore drills are required before production.

## Implementation phases

### Phase 0 — Foundation (complete)

NestJS bootstrap, configuration validation, Prisma, Docker, PostgreSQL, Redis,
Swagger, formatting, linting, tests, build, and CI.

### Phase 1 — Identity and vehicles (complete)

Registration, login, rotating refresh sessions, user profile, vehicle CRUD,
odometer history, ownership checks, and multi-user isolation.

### Phase 2 — Maintenance (complete)

Idempotent starter templates, customizable vehicle plans, independent calendar
and mileage status calculations, agenda, service history, and transactional plan
completion.

### Phase 3 — Costs and reports (complete)

Maintenance expenses, optional service linkage, controlled categories, monthly
and yearly totals, and protection against double-counting service costs.

### Phase 4 — Alerts (complete)

BullMQ scheduling, Redis-backed jobs, Web Push subscriptions, deduplication,
retry with backoff, and delivery history.

### Phase 5 — VPS production

Production image hardening, HTTPS reverse proxy, backups, observability,
deployment, rollback, and restore testing.

### Future phase — Attachments

S3-compatible storage provider, pre-signed uploads, type and size validation,
retention, and consistent object deletion.

## Agent and model strategy

| Task                                                           | Model           | Reasoning |
| -------------------------------------------------------------- | --------------- | --------- |
| Architecture, Prisma/PostgreSQL, authentication, notifications | `gpt-5.6-sol`   | `high`    |
| Security, domain, and integration reviews                      | `gpt-5.6-sol`   | `high`    |
| CRUD, seeds, documentation, and routine changes                | `gpt-5.6-sol`   | `medium`  |
| Well-defined cost-sensitive work                               | `gpt-5.6-terra` | `high`    |
| Exceptional unresolved problems                                | `gpt-5.6-sol`   | `xhigh`   |

Work proceeds one phase at a time. Independent tasks may run in parallel, while
Prisma schema and migration changes remain centralized. Every phase ends with
an integrated `high` review and must pass lint, typecheck, relevant tests, and
build before completion.
