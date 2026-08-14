# Frontend Implementation Plan

## 1. Product objective

Build a responsive, installable web application for the Maintenance Car API.
The product must work equally well on phones and desktops, support multiple
vehicles, and cover the complete existing backend scope: authentication,
vehicles, odometer readings, maintenance plans, service history, agenda,
expenses, reports, notifications, and user preferences.

The first release will be a Progressive Web App (PWA). A native application is
not part of the initial scope, but domain logic and API contracts must remain
portable enough for a future native client.

The application launches in Brazilian Portuguese and is fully prepared for
additional locales. No user-facing text may be hard-coded inside components.

## 2. Framework decision

Use **Vue 3 with Nuxt and TypeScript**.

Nuxt provides routing, layouts, build conventions, runtime configuration, and a
clear path to server-side capabilities if they become useful. The first version
will behave as a client-rendered SPA/PWA because the authenticated product does
not benefit materially from SSR.

Vue is preferred for this project because its templates and Composition API
keep form-heavy domain screens readable, while Nuxt provides conventions
without forcing the frontend into the backend deployment model.

### Core stack

- Nuxt with Vue 3 and strict TypeScript;
- PrimeVue in unstyled mode as the accessible component foundation;
- application-owned wrapper components around every third-party component;
- Tailwind CSS for layout and design tokens, not ad hoc visual decisions;
- Pinia for small client-owned state such as session UI and vehicle selection;
- TanStack Query for remote data, caching, invalidation, and mutations;
- `openapi-typescript` for generated API types from the backend OpenAPI JSON;
- a small typed API client owned by the application;
- VeeValidate with Zod schemas for forms;
- Vue I18n through the Nuxt integration;
- `@vite-pwa/nuxt` for the manifest, service worker, updates, and Web Push;
- Chart.js through a thin application wrapper for cost visualizations;
- Lucide icons, using a consistent subset and stroke weight;
- date-fns with explicit user timezone handling where necessary.

Dependencies must be pinned through the lockfile. Generated OpenAPI types must
never be manually edited.

## 3. Repository organization

Move to an npm workspace while retaining a single repository:

```text
app/
  backend/                 current NestJS application
  frontend/                Nuxt application
packages/
  api-contract/            generated OpenAPI types and generation script
package.json               workspace commands
compose.yml                local and production service orchestration
plan-front.md
```

The backend move must be performed as a dedicated mechanical change before
frontend feature development. Git history must be preserved, imports and Docker
paths must be updated, and the backend quality suite must pass unchanged before
continuing.

Root commands should provide a consistent developer experience:

```text
npm run dev
npm run dev:backend
npm run dev:frontend
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run api:generate
```

## 4. Information architecture

### Public routes

- `/login`
- `/register`
- `/forgot-password` as a disabled future route until backend support exists

### Authenticated routes

- `/` — dashboard
- `/vehicles` — vehicle list and creation
- `/vehicles/:vehicleId` — vehicle overview
- `/vehicles/:vehicleId/odometer` — odometer history
- `/vehicles/:vehicleId/agenda` — maintenance status and upcoming work
- `/vehicles/:vehicleId/plans` — maintenance plans
- `/vehicles/:vehicleId/history` — completed maintenance
- `/vehicles/:vehicleId/expenses` — maintenance expenses
- `/reports` — monthly and annual cost reports
- `/notifications` — notification inbox
- `/settings/profile` — profile, locale, timezone, and theme
- `/settings/notifications` — push permission and subscriptions
- `/settings/attachments` — visible but disabled, clearly marked as planned

On mobile, use a bottom navigation bar for Dashboard, Agenda, Add, Expenses, and
More. On desktop, use a compact left navigation rail with labels. The primary
creation action opens a contextual action sheet rather than a generic floating
button on every screen.

## 5. Vehicle context

The currently selected vehicle is shared across vehicle-scoped pages.

- With no vehicles, show onboarding and a direct creation flow.
- With exactly one vehicle, select it automatically and do not render a switcher.
- With more than one vehicle, render a global vehicle switcher in the application
  header.
- Store the last selected vehicle ID locally, but validate it against the current
  authenticated user's vehicle list on every new session.
- Vehicle-scoped URLs always contain `vehicleId`; the global selector navigates
  to the equivalent route for the newly selected vehicle when possible.
- Deleted or inaccessible vehicle IDs fall back safely to the first active
  vehicle without leaking authorization details.

## 6. Dashboard proposal

The dashboard should answer three questions immediately: what needs attention,
what is coming next, and how much is being spent.

### Mobile order

1. Vehicle summary with current odometer and quick update action.
2. Attention strip showing overdue maintenance count and independent reasons.
3. Next three maintenance items ordered by urgency.
4. This month's maintenance cost and comparison with the previous month.
5. Recent maintenance history.
6. Notification permission prompt, shown only when contextually appropriate.

### Desktop composition

- A narrow vehicle and odometer summary column.
- A larger maintenance timeline containing overdue and upcoming work.
- A cost panel with monthly total and a restrained six-month chart.
- Recent activity below the main content.

Each overdue item must explain calendar and odometer status separately. Never
collapse “overdue by date” and “overdue by mileage” into a single unexplained
badge.

The dashboard is useful with one vehicle and scales to several through the
conditional global switcher. Cross-vehicle aggregation belongs in Reports, not
in the default vehicle dashboard.

## 7. Visual direction

The interface combines automotive precision, technical clarity, and restrained
minimalism. It must feel authored for vehicle maintenance rather than assembled
from a generic dashboard template.

### Foundation

- Primary wine color around `#6F1D2B`, adjusted into accessible light and dark
  scales after contrast testing.
- Warm neutral backgrounds instead of pure blue-gray dashboards.
- Off-white light canvas and near-charcoal dark canvas.
- Tabular numerals for odometer, currency, dates, and intervals.
- A robust sans-serif interface family with clear distinctions between labels,
  values, and supporting text.
- Status colors retain their conventional meaning and do not rely on color alone.
- Thin dividers, deliberate alignment, and moderate information density.

### Avoiding an AI-generated appearance

- Do not use decorative gradients, glowing blobs, glassmorphism, excessive
  rounded cards, or arbitrary floating elements.
- Do not place every piece of information inside an isolated card.
- Avoid oversized marketing headings inside operational screens.
- Use domain-specific language, icons, empty states, and examples.
- Prefer clear tables, timelines, and grouped fields over a uniform card grid.
- Use motion only to explain state changes; respect reduced-motion preferences.
- Maintain a consistent spacing rhythm and a limited set of radii and shadows.
- Empty states must explain the next useful action without illustrations that
  look unrelated to vehicle maintenance.

### Theme

Support light, dark, and system themes from the first navigable release. Theme
tokens live in one semantic layer. Components may reference tokens such as
`surface`, `text-muted`, `border`, `primary`, `danger`, and `status-overdue`, but
not raw palette values.

## 8. Component strategy

PrimeVue is an implementation detail, not the public component API of the app.
Wrap used primitives under `components/ui`:

```text
AppButton
AppInput
AppSelect
AppDialog
AppDrawer
AppTable
AppPagination
AppToast
AppTabs
AppDatePicker
AppCurrencyInput
AppOdometerInput
AppStatusBadge
AppEmptyState
AppSkeleton
```

Domain components live separately:

```text
VehicleSwitcher
VehicleSummary
MaintenanceStatus
MaintenanceTimeline
OdometerUpdateForm
MaintenancePlanForm
MaintenanceRecordForm
ExpenseForm
CostSummary
NotificationPermission
```

Wrappers own accessibility defaults, loading behavior, error presentation,
analytics hooks, translations, and visual tokens. Feature code must not import
PrimeVue directly. Avoid wrappers that merely rename a third-party component;
each wrapper should establish a meaningful application contract.

## 9. API integration and authentication

The backend Swagger document at `/docs/openapi.json` is the source of truth.

- Generate TypeScript types in `packages/api-contract`.
- Fail CI when generation produces an uncommitted contract change.
- Keep transport concerns in `app/frontend/services/api`.
- Normalize backend errors into a stable frontend error shape.
- Add request correlation IDs to error diagnostics when provided by the backend.
- Use TanStack Query keys built by centralized factories.
- Invalidate the smallest affected query set after mutations.
- Never duplicate server state into Pinia.

### Required authentication hardening

Before production, change refresh-token transport to a `Secure`, `HttpOnly`,
same-site cookie served under the same site as the frontend. Keep the short-lived
access token in memory and refresh it during application bootstrap. Do not store
refresh tokens in Local Storage or IndexedDB.

The backend must define the CSRF posture, allowed origin, cookie path, logout
clearing behavior, and production proxy settings. Until this is implemented,
frontend authentication may use the current contract only for local development.

Route middleware protects authenticated pages. A single refresh operation must
be shared among concurrent failed requests, and a failed refresh must clear the
session deterministically without retry loops.

## 10. Forms and domain behavior

- Reuse backend constraints in frontend Zod schemas where they improve feedback;
  the backend remains authoritative.
- Display field-level validation and a form-level fallback error.
- Preserve user input after recoverable network failures.
- Represent money as decimal strings and format only for display.
- Never convert currency values through binary floating-point arithmetic.
- Display dates in the user's timezone and send API values in their documented
  format.
- Ask for confirmation before destructive soft-delete actions.
- Disable duplicate submissions while preserving clear progress feedback.
- Use optimistic updates only for reversible, low-risk actions such as marking a
  notification as read. Financial and maintenance mutations wait for the server.

The maintenance completion flow should allow the user to review the selected
plan, completion date, odometer, workshop, notes, and total cost on one focused
screen. After success, refresh agenda, history, vehicle odometer, reports, and
relevant dashboard queries.

## 11. PWA and push notifications

- Provide an installable manifest, icons, theme colors, and update flow.
- Cache the application shell and static assets, but do not pretend mutations
  succeeded while offline.
- Show a clear offline banner and disable write actions that require the API.
- Do not cache authenticated API responses in the service worker by default.
- Request notification permission only after explaining its maintenance value;
  never request it immediately on first page load.
- Register the browser subscription through the existing push-subscription API.
- Handle revoked permission, changed subscriptions, and 404/410 cleanup.
- A push click routes to the relevant vehicle agenda or notification detail.
- The in-app notification inbox works independently of browser push permission.

Service-worker update and push-event logic must coexist in one controlled setup;
do not register competing service workers from separate libraries.

## 12. Internationalization

- Default locale: `pt-BR`.
- Establish locale namespaces per feature from the beginning.
- Use ICU-style pluralization for days, kilometers, vehicles, and notifications.
- Centralize date, number, currency, and unit formatting.
- Keep API enum values separate from translated labels.
- Use stable translation keys rather than source sentences as keys.
- Add a pseudo-locale development check later to expose layout assumptions.
- The locale selector may initially show only Brazilian Portuguese while the
  architecture remains ready for new translation files.

## 13. Accessibility and responsive behavior

Target WCAG 2.2 AA for core journeys.

- All workflows must be keyboard operable.
- Maintain visible focus and correct focus restoration after dialogs.
- Use semantic headings, landmarks, labels, tables, and live regions.
- Provide text/icon distinctions in addition to status colors.
- Ensure touch targets are at least 44 by 44 CSS pixels.
- Test 320 px mobile width through wide desktop layouts.
- Tables become purpose-built mobile lists rather than horizontally compressed
  desktop tables when information hierarchy requires it.
- Charts must have accompanying textual summaries.

## 14. Testing strategy

Follow a practical testing pyramid.

### Unit tests — largest layer

- formatters, status presentation, query-key factories, and API error mapping;
- Zod schemas and domain-specific composables;
- vehicle selection and authentication state transitions;
- currency and timezone boundary behavior.

Use Vitest.

### Component and integration tests — focused middle layer

- forms, field errors, loading states, empty states, and dialogs;
- maintenance status with separate date and mileage reasons;
- dashboard composition under zero, one, and multiple vehicles;
- API interaction through MSW rather than mocked implementation details;
- theme and locale-sensitive behavior where meaningful.

Use Vue Testing Library, Vitest, and MSW.

### End-to-end tests — small critical layer

Use Playwright against the real frontend and a dedicated backend/database:

1. Register, log in, refresh the page, and log out.
2. Create the first vehicle and add an odometer reading.
3. Create a plan from a template and complete maintenance.
4. Verify independent calendar and mileage warnings in the agenda.
5. Create an expense and verify the cost report.
6. Switch between two vehicles and verify isolation.
7. Read a notification and configure push through a browser-compatible stub.
8. Verify the essential mobile navigation journey.

Visual regression tests cover a small set of stable screens in light/dark and
mobile/desktop modes. They are review aids, not substitutes for behavioral tests.

## 15. Observability, privacy, and security

- Never log tokens, passwords, push keys, notes, or full vehicle identifiers.
- Present a user-safe error reference while retaining technical diagnostics for
  monitoring.
- Add frontend error monitoring only after choosing a provider and documenting
  data retention and redaction.
- Set a restrictive Content Security Policy compatible with the selected push
  services.
- Avoid third-party scripts in the MVP.
- Sanitize and encode all user content through normal Vue rendering; do not use
  raw HTML for maintenance notes.
- Add dependency, bundle-size, accessibility, and Lighthouse checks without
  making volatile scores the only release gate.

## 16. Delivery phases

Every phase ends with a navigable result, relevant automated tests, an
accessibility pass, responsive review, lint, typecheck, and production build.

### F0 — Workspace and contract foundation

- Move the backend to `app/backend` and establish npm workspaces.
- Scaffold Nuxt in `app/frontend`.
- Add OpenAPI type generation and the typed client.
- Configure linting, formatting, strict TypeScript, tests, CI, and Docker paths.
- Introduce environment validation for the public API base URL.
- Preserve and pass the complete backend suite after the move.

**Navigable outcome:** frontend health screen communicating with the local API.

### F1 — Design system and application shell

- Establish visual tokens, typography, wine palette, light/dark/system themes,
  icons, wrappers, responsive layouts, and translation infrastructure.
- Implement public and authenticated shells plus mobile/desktop navigation.
- Build the reusable loading, error, empty, and offline states.

**Navigable outcome:** responsive component gallery and realistic application
shell in both themes.

### F2 — Authentication and first vehicle onboarding

- Implement registration, login, secure session bootstrap, logout, and guarded
  routes.
- Coordinate the backend `HttpOnly` refresh-cookie change.
- Implement vehicle list, creation, editing, soft deletion, conditional global
  switcher, vehicle detail, and odometer history/update.

**Navigable outcome:** a user can create an account and manage the first vehicle
from phone or desktop.

### F3 — Dashboard, plans, and agenda

- Implement the proposed dashboard and vehicle overview.
- Add maintenance template selection, custom plans, plan editing, filters, and
  deletion.
- Add the agenda with explicit time and mileage reasons.

**Navigable outcome:** the user sees what is overdue and can configure the
vehicle's maintenance schedule.

### F4 — Maintenance history

- Implement maintenance completion from a plan and standalone service records.
- Add history list, details, filters, edit, delete, and synchronized refreshes.
- Refine odometer conflict and stale-data feedback.

**Navigable outcome:** the complete maintenance lifecycle works end to end.

### F5 — Expenses and reports

- Implement expense CRUD with maintenance-record linkage.
- Add monthly and annual report filters, totals, categories, and restrained
  visualizations.
- Verify decimal precision and the backend's double-counting policy in UI tests.

**Navigable outcome:** users can understand maintenance spending without manual
calculations.

### F6 — Notifications and PWA

- Add notification inbox, unread state, deep links, permission education, push
  subscription management, installation, offline behavior, and update prompts.
- Add disabled attachment settings with a clear future-state explanation.

**Navigable outcome:** an installable PWA receives and manages maintenance
alerts.

### F7 — Production readiness

- Integrate frontend and backend production images with Caddy and same-origin
  routing.
- Add deployment configuration, CSP, compression, cache headers, health checks,
  monitoring hooks, backup documentation, and rollback steps.
- Run E2E, accessibility, mobile-device, performance, and restore rehearsals.

**Navigable outcome:** a release candidate ready for the selected VPS.

## 17. Agent and model strategy

| Work | Model | Reasoning |
| --- | --- | --- |
| Frontend architecture, authentication, PWA, push, security, and final reviews | `gpt-5.6-sol` | `high` |
| Design system direction, complex state, API integration, and test architecture | `gpt-5.6-sol` | `high` |
| Pages, CRUD flows, routine components, tests, documentation, and refinements | `gpt-5.6-sol` | `medium` |
| Well-defined cost-sensitive implementation work | `gpt-5.6-terra` | `high` |
| Exceptional unresolved architectural or concurrency problems only | `gpt-5.6-sol` | `xhigh` |

Independent feature work may run in parallel only after shared contracts and
design-system APIs are stable. Changes to the generated API contract, global
tokens, authentication transport, workspace structure, and service worker remain
centrally coordinated. Each phase ends with an integrated `high` review.

## 18. Definition of done

A frontend phase is complete only when:

- its stated journey is navigable on mobile and desktop;
- loading, empty, error, offline, and permission states are intentional;
- user-facing strings use translation keys;
- keyboard and screen-reader basics have been verified;
- generated API contracts are current;
- unit/component tests and the relevant E2E journey pass;
- lint, format, strict typecheck, and production build pass;
- no refresh token or sensitive data is persisted in browser-accessible storage;
- documentation and screenshots reflect the delivered behavior;
- the implementation has received the review level defined above.

## 19. Explicitly deferred work

- Native iOS or Android application;
- file and photo uploads until S3-compatible storage is implemented;
- offline creation or synchronization of maintenance records and expenses;
- social login;
- password recovery until the backend supports it;
- multiple production languages beyond the prepared localization structure;
- fuel, insurance, tax, and non-maintenance vehicle management.
