# Ecwid Publishing Checklist

This repo ships a static Ecwid admin app. Publishing readiness is therefore about the hosted URLs, listing materials, and merchant-facing support/privacy information rather than backend infrastructure.

## Current publishing status

- app page: ready at `public/index.html`
- standalone preview: ready at `public/storefront-test.html`
- privacy page: ready at `public/privacy.html`
- support page: scaffolded at `public/support.html`
- publishing profile: ready at `config/publishing-profile.json`
- automated CI: ready in `.github/workflows/ci.yml`
- GitHub Pages deploy: ready in `.github/workflows/deploy-pages.yml`
- release artifact packaging: ready in `.github/workflows/release-package.yml`
- App Market artwork: source and exported files ready in `assets/marketplace/`
- final support contact details: still needed before submission

## Hosted URLs to prepare

Before submission, deploy the static app over HTTPS and confirm these URLs work publicly:

- app page URL: `/public/index.html`
- privacy URL: `/public/privacy.html`
- support URL: `/public/support.html`

For this repository's GitHub Pages setup, the expected hosted URLs are:

- `https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/index.html`
- `https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/privacy.html`
- `https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/support.html`

The Ecwid app listing should point to real hosted pages, not local development URLs.

The repository-level publishing metadata is centralized in `config/publishing-profile.json`. Update that file first when app naming, hosted URLs, support contacts, or marketplace artwork paths change.

## Listing materials to finalize

- app name and short description aligned with the owner-only positioning
- exported app icon and listing artwork based on the SVG source set
- exported screenshots or product images that show the actual merchant dashboard
- support contact details on the public support page
- support email or other final publisher contact details in `config/publishing-profile.json`
- privacy copy reviewed against the shipped browser-local behavior
- exported PNG assets from `assets/marketplace/exported/`

Use `assets/marketplace/README.md` to track the final artwork set. The repo now includes the editable source artwork plus runtime-captured screenshots for the icon, listing cover, and three submission images.

## Review-sensitive checks

- keep all pages on HTTPS
- do not imply live shopper monitoring or centralized telemetry
- keep the privacy notice accurate: settings are browser-local and exported JSON is merchant-triggered
- ensure the support page explains how merchants reproduce issues and export the session
- confirm the app page still loads without a backend or OAuth callback

## Release workflow

1. Run `npm run build`
2. Run `npm run lint`
3. Run `npm test`
4. Run `npm run publish:check`
5. Run `npm run marketplace:screenshots` against the local app if the UI changed
6. Deploy `dist/` or the repository root to your static host
7. Verify `public/index.html`, `public/privacy.html`, and `public/support.html` over HTTPS
8. Confirm the GitHub-based support links and final exported artwork still match the live repo
9. Register the hosted app page URL in Ecwid
10. Submit the listing