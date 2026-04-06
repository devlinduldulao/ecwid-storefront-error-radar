# Storefront Error Radar for Ecwid

Static Ecwid owner app for storefront diagnostics. It runs inside the merchant dashboard, embeds the merchant's own Ecwid storefront as a preview, and captures runtime issues only while that owner is testing.

## What changed

This repo is no longer an Express boilerplate. It is intentionally constrained to avoid recurring infrastructure cost.

- No Node.js server in production
- No database
- No Redis
- No visitor-side telemetry pipeline
- No webhook ingestion

The result is an owner-facing diagnostic desk, not a customer monitoring service.

## Product shape

The Ecwid version now works like this:

1. The merchant opens the app page inside the Ecwid admin dashboard.
2. The app reads the store ID from the Ecwid iframe payload.
3. The app loads an embedded Ecwid storefront preview for that store.
4. While the merchant clicks through catalog, product, cart, and checkout flows, the app records JavaScript, asset, and network failures in memory.
5. Session settings are stored in browser local storage for that store.
6. The merchant can switch to a built-in demo preview that seeds fake incidents without loading a real storefront.
7. The merchant can review the incident feed and export the session as JSON.

That keeps the app deployable on static hosting. It also means there is no shared historical incident archive across merchants or browsers.

## Quick start

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:4173/public/storefront-test.html?storeId=YOUR_STORE_ID`
- `http://localhost:4173/public/index.html?storeId=YOUR_STORE_ID`

The standalone page is for local iteration. In source, the admin dashboard lives at `public/index.html`. In production, the build publishes that page at the site root so your Ecwid app page URL can be the clean base URL of your static host.

Use the `Use Demo Preview` button when you want to simulate the dashboard with fake data, validate summary cards, or show the product without relying on a live Ecwid store response.

## Project structure

```text
storefront-error-radar/
├── public/
│   ├── app.css                 # Dashboard styles
│   ├── index.html              # Ecwid admin iframe page
│   └── storefront-test.html    # Standalone local preview page
├── src/
│   ├── admin/
│   │   └── app.js              # Owner dashboard logic
│   ├── shared/
│   │   └── diagnostics-core.js # Session-only incident collector
│   └── storefront/
│       ├── custom-storefront.css
│       └── custom-storefront.js
├── docs/
├── scripts/
│   ├── setup.sh
│   └── smoke-test.js
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
└── README.md
```

## Available scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Create a deployable static copy in `dist/` |
| `npm run dev` | Serve the repo on port `4173` for local testing |
| `npm run preview` | Same as `dev` |
| `npm run lint` | Run syntax checks on runtime and automated test scripts |
| `npm test` | Run unit, integration, and smoke coverage for the static app |
| `npm run publish:check` | Verify publish-facing pages, docs, workflow, and artwork sources |

## Architecture summary

```text
Ecwid admin iframe
    -> public/index.html
    -> EcwidApp SDK payload
    -> embedded Ecwid storefront preview
    -> browser-only diagnostics collector
    -> in-memory incident feed
    -> localStorage-backed owner preferences
```

## Constraints

These constraints are deliberate, not accidental.

- The app is for Ecwid business owners, not site visitors.
- Diagnostics exist only while the owner uses the dashboard.
- Settings are browser-local, so they do not sync across machines.
- Without a backend, anonymous shopper sessions cannot be centrally collected.

If you later decide you need cross-device history, merchant-wide settings sync, or automated visitor monitoring, that will require a real backend. This repo avoids that on purpose.

## Deployment

Deploy the repo to any static host that can serve the repository root, then register the Ecwid app page URL to point to the deployed site root.

For App Market submission, also deploy the support and privacy pages:

- `public/privacy.html`
- `public/support.html`

This repository already includes a free GitHub Pages deployment workflow in `.github/workflows/deploy-pages.yml`. Every push to `main` builds `dist/` and publishes it through GitHub Actions.

The expected production URLs are:

- `https://devlinduldulao.github.io/ecwid-storefront-error-radar/`
- `https://devlinduldulao.github.io/ecwid-storefront-error-radar/privacy.html`
- `https://devlinduldulao.github.io/ecwid-storefront-error-radar/support.html`

To enable it in GitHub:

1. Push this repository to GitHub.
2. Open **Settings > Pages**.
3. Set **Source** to **GitHub Actions**.
4. Let the `Deploy to GitHub Pages` workflow complete on the next push to `main`.
5. Register `https://devlinduldulao.github.io/ecwid-storefront-error-radar/` as the Ecwid app page URL.

Good fits:

- GitHub Pages
- Netlify
- Cloudflare Pages
- Vercel static hosting

See `docs/DEPLOYMENT.md` for the exact deployment model.
See `docs/PUBLISHING.md` for the listing checklist and final submission gaps.
See `assets/marketplace/README.md` for the current App Market artwork set and export guidance.

---

## API Reference

See [docs/API.md](docs/API.md) for detailed API documentation.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive into the architecture.

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full development guide.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions.

---

## Ecwid Resources

### Getting Started

| Resource | Link |
|----------|------|
| Ecwid Developer Portal (register apps) | https://developers.ecwid.com/ |
| App Development Guide | https://api-docs.ecwid.com/docs/get-started |
| Ecwid App Market (see published apps) | https://www.ecwid.com/apps |
| Sign Up for Free Ecwid Account | https://www.ecwid.com/ |
| Ecwid Control Panel (store admin) | https://my.ecwid.com/ |

### REST API v3

| Resource | Link |
|----------|------|
| API Overview & Reference | https://api-docs.ecwid.com/reference/overview |
| Products API | https://api-docs.ecwid.com/reference/products |
| Orders API | https://api-docs.ecwid.com/reference/orders |
| Customers API | https://api-docs.ecwid.com/reference/customers |
| Categories API | https://api-docs.ecwid.com/reference/categories |
| Discount Coupons API | https://api-docs.ecwid.com/reference/discount-coupons |
| Store Profile API | https://api-docs.ecwid.com/reference/store-profile |
| Product Variations API | https://api-docs.ecwid.com/reference/product-variations |
| Abandoned Carts API | https://api-docs.ecwid.com/reference/abandoned-carts |
| Shipping Options API | https://api-docs.ecwid.com/reference/shipping-options |
| Tax Settings API | https://api-docs.ecwid.com/reference/taxes |
| Application Storage API | https://api-docs.ecwid.com/reference/storage |
| Starter Site API | https://api-docs.ecwid.com/reference/starter-site |

### Authentication & Security

| Resource | Link |
|----------|------|
| OAuth 2.0 Authentication | https://api-docs.ecwid.com/docs/authentication |
| Access Scopes Reference | https://api-docs.ecwid.com/docs/access-scopes |
| API Tokens & Keys | https://api-docs.ecwid.com/docs/api-tokens |

### Storefront Customisation

| Resource | Link |
|----------|------|
| JavaScript Storefront API | https://api-docs.ecwid.com/docs/customize-storefront |
| Storefront JS API Reference | https://api-docs.ecwid.com/docs/storefront-js-api-reference |
| Custom CSS for Storefront | https://api-docs.ecwid.com/docs/customize-appearance |
| Page Events (OnPageLoaded, etc.) | https://api-docs.ecwid.com/docs/page-events |
| Cart Methods (add, remove, get) | https://api-docs.ecwid.com/docs/cart-methods |
| Public App Config (storefront injection) | https://api-docs.ecwid.com/docs/public-app-config |
| SEO for Ecwid Stores | https://api-docs.ecwid.com/docs/seo |

### App Development

| Resource | Link |
|----------|------|
| Native Apps (admin iframe) | https://api-docs.ecwid.com/docs/native-apps |
| Ecwid App UI CSS Framework | https://api-docs.ecwid.com/docs/ecwid-css-framework |
| EcwidApp JS SDK Reference | https://api-docs.ecwid.com/docs/ecwidapp-js-sdk |
| App Storage (key-value per store) | https://api-docs.ecwid.com/docs/app-storage |
| Custom Shipping Methods | https://api-docs.ecwid.com/docs/add-shipping-method |
| Custom Payment Methods | https://api-docs.ecwid.com/docs/add-payment-method |
| Custom Discount Logic | https://api-docs.ecwid.com/docs/add-custom-discount |
| App Listing Requirements | https://api-docs.ecwid.com/docs/app-listing-requirements |

### Embedding & Widgets

| Resource | Link |
|----------|------|
| Add Ecwid to Any Website | https://api-docs.ecwid.com/docs/add-ecwid-to-a-site |
| Product Browser Widget Config | https://api-docs.ecwid.com/docs/product-browser |
| Buy Now Buttons | https://api-docs.ecwid.com/docs/buy-now-buttons |
| Single Sign-On (SSO) | https://api-docs.ecwid.com/docs/single-sign-on |

### Guides & Tutorials

| Resource | Link |
|----------|------|
| API Rate Limits | https://api-docs.ecwid.com/docs/rate-limits |
| Error Codes Reference | https://api-docs.ecwid.com/docs/errors |
| Testing Your App | https://api-docs.ecwid.com/docs/testing |
| Publishing to App Market | https://api-docs.ecwid.com/docs/publishing |
| Ecwid Community Forum | https://community.ecwid.com/ |
| Ecwid Help Center | https://support.ecwid.com/ |
| Ecwid Status Page | https://status.ecwid.com/ |
| Ecwid Blog | https://www.ecwid.com/blog |

---

## License

MIT
