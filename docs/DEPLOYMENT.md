# Deployment Guide

This Ecwid app is deployed as static files.

## Required hosting model

You need a host that can serve the repository root over HTTPS so Ecwid can load `public/index.html` inside the admin iframe.

Good options:

- GitHub Pages
- Netlify
- Cloudflare Pages
- Vercel static hosting

## What to deploy

Deploy the repository root, not only the `public` folder, because the runtime HTML references scripts under `src/`.

Key production assets:

- `public/index.html`
- `public/app.css`
- `public/privacy.html`
- `public/support.html`
- `src/admin/app.js`
- `src/shared/diagnostics-core.js`
- `src/storefront/custom-storefront.js`
- `src/storefront/custom-storefront.css`

If you want a clean deployment directory, run `npm run build` and deploy `dist/`.

## Ecwid app registration

In the Ecwid Partner Portal or custom app configuration, set the app page URL to the deployed `public/index.html` path.

For publishing, also host stable support and privacy URLs from the same deployment so the listing can reference real HTTPS pages.

Example:

```text
https://your-static-host.example.com/public/index.html
```

There is no OAuth callback URL and no webhook URL in this version because there is no backend.

## Platform-specific notes

### GitHub Pages

This repository already includes the recommended free deployment workflow at `.github/workflows/deploy-pages.yml`.

- GitHub Actions runs on every push to `main`.
- The workflow installs dependencies with `npm ci`.
- It builds the static artifact with `npm run build`.
- It publishes `dist/` to GitHub Pages.

Recommended setup for this repository:

1. Push the latest `main` branch to GitHub.
2. Open the repository settings and enable GitHub Pages.
3. Set the source to GitHub Actions.
4. Let `.github/workflows/deploy-pages.yml` publish the `dist/` artifact.
5. Keep local asset links relative inside `public/` so the site works from the repository-scoped Pages URL.
6. Verify these URLs return 200:
	- `https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/index.html`
	- `https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/privacy.html`
	- `https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/support.html`
7. Register the hosted app page URL in Ecwid and use the support/privacy URLs in the listing.

### Netlify or Cloudflare Pages

- Build command: none required
- Publish directory: repository root
- Register `.../public/index.html` as the Ecwid app page URL.

### Vercel

- Use static file hosting only.
- Do not add serverless handlers for this app unless the product requirement changes.

## Security posture

- No secrets are required in the browser bundle.
- No server routes exist.
- No customer event archive is retained centrally.

## Operational limitation

Because this app is static and browser-local, settings and sessions are not shared across browsers. That tradeoff is the price of avoiding backend infrastructure.
