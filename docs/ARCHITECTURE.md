# Architecture

This Ecwid repo is intentionally static. It is designed for a merchant testing their own storefront from the Ecwid dashboard without provisioning a backend service.

## Core rule

Detect issues while the owner is actively testing, then forget them when the session ends.

```text
Ecwid admin iframe
    -> dashboard shell
    -> embedded Ecwid storefront preview
    -> optional seeded demo preview
    -> browser event collectors
    -> in-memory incident feed
    -> export JSON when needed
```

## Why this architecture

- It keeps the Ecwid version deployable on free or cheap static hosting.
- It avoids backend operations, credential storage, and webhook maintenance.
- It matches the actual product constraint: this app is for merchants, not shoppers.
- It prevents the repo from pretending to offer centralized visitor telemetry when it cannot do that without infrastructure.

## Main modules

- `public/index.html`: Ecwid admin iframe page.
- `public/storefront-test.html`: standalone local preview page.
- `public/app.css`: dashboard styles.
- `src/admin/app.js`: owner dashboard orchestration, local settings, preview actions, export.
- `src/shared/diagnostics-core.js`: browser-only incident collection and summary logic.
- `src/storefront/custom-storefront.js`: Ecwid preview loader and page-context bridge.
- `src/storefront/custom-storefront.css`: styling applied only inside the embedded preview shell.

## Runtime flow

1. Ecwid loads `public/index.html` inside the admin iframe.
2. `EcwidApp` provides the store ID.
3. The dashboard loads saved browser-local settings for that store.
4. The preview loader injects the Ecwid storefront widget into the dashboard, unless the owner enables the built-in demo preview.
5. Demo preview mode renders a synthetic storefront scene and seeds fake incidents directly into the browser-only collector.
6. The diagnostics core observes JavaScript errors, unhandled rejections, asset failures, fetch failures, XHR failures, and slow requests.
7. The dashboard renders the incident feed and summary cards.
8. The merchant can clear the session or export it as JSON.

## Data model

The session feed stores only sanitized event summaries:

- event type
- severity
- page type
- normalized path
- coarse status bucket
- coarse duration bucket
- fingerprint
- timestamp
- store ID

There is no persistent central store and no customer identity data.

## Important limitations

- Settings are stored in browser local storage, so they are not shared across devices.
- Session incidents exist only in the current tab lifecycle unless the merchant exports them.
- True visitor-side monitoring is out of scope without a backend receiver.

## Extension rule

If you extend this repo, preserve the no-backend contract unless the product requirement explicitly changes. Do not quietly reintroduce server routes, databases, or webhook dependencies.
