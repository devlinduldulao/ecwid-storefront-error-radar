# Development Guide

This repo is a static Ecwid owner dashboard. Local development only needs a static file server.

## Setup

```bash
npm install
npm run dev
```

The repo is then available at `http://localhost:4173`.

## Main local entry points

- `http://localhost:4173/public/storefront-test.html?storeId=YOUR_STORE_ID`
- `http://localhost:4173/public/index.html?storeId=YOUR_STORE_ID`

Use `storefront-test.html` when iterating outside the Ecwid admin iframe. Use `index.html` when wiring the real Ecwid app page.

## Editing areas

### Owner dashboard

- `public/index.html`
- `public/app.css`
- `src/admin/app.js`

Use this area for layout, settings, export behavior, and summary rendering.

### Diagnostics core

- `src/shared/diagnostics-core.js`

Use this area for browser-only incident capture, deduplication, summary building, and derived event logic.

### Ecwid preview bridge

- `src/storefront/custom-storefront.js`
- `src/storefront/custom-storefront.css`

Use this area for loading the Ecwid widget, mapping Ecwid page transitions into dashboard context, and styling the embedded preview.

## Local testing workflow

1. Start the static server with `npm run dev`.
2. Open `public/storefront-test.html` with a real `storeId` query parameter.
3. Interact with the embedded Ecwid preview.
4. Toggle `Use Demo Preview` when you want seeded fake incidents without depending on a live storefront response.
5. Watch the summary cards and incident feed update.
6. Export the session JSON if you need to inspect captured events.

## Running checks

```bash
npm run build
npm run lint
npm test
```

`npm run build` copies the runtime app into `dist/` for static deployment.

`npm run lint` uses syntax checks for the runtime JavaScript files.

`npm test` validates the static dashboard contract:

- required entry pages exist
- runtime scripts are referenced
- owner-only positioning remains intact
- package scripts do not point back to Express
- removed backend files stay removed

## Important constraints for contributors

- Do not add a backend unless the product requirement explicitly changes.
- Do not introduce database-dependent settings persistence.
- Do not turn this into live visitor monitoring without calling out the infrastructure requirement.
- Keep runtime assets static-host friendly.

### Adding storefront customisation

Edit `src/storefront/custom-storefront.js` — add to the `OnPageLoaded` handler or create new event listeners.

### Adding admin dashboard features

Edit `public/index.html` for layout and `src/admin/app.js` for logic. Use the [Ecwid App UI CSS](https://api-docs.ecwid.com/docs/native-apps) classes for consistent styling.

The demo preview mode lives in the same dashboard layer. Keep its incidents clearly marked as owner-side fake data and avoid implying that seeded events came from real shoppers.

---

## Debugging Tips

- **Build output:** Inspect `dist/` after `npm run build`
- **Storefront JS:** Use browser DevTools console in the standalone preview page
- **Admin dashboard:** Open DevTools in the Ecwid admin — the iframe has a separate console
- **Preview bootstrap issues:** Reload the embedded preview and check for blocked script requests to `app.ecwid.com`

---

## Project Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| File names | kebab-case | `diagnostics-core.js` |
| Variables | camelCase | `storeId`, `slowRequestMs` |
| Storage keys | lowercase with separators | `storefront-error-radar:ecwid:123:settings` |
| CSS classes | prefixed | `.ser-preview-shell` |
| Commits | Conventional style | `feat: add export metadata` |
