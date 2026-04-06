# Release Template

Use this template for GitHub releases and Ecwid reviewer notes.

## Summary

Storefront Error Radar for Ecwid is a static, owner-only diagnostics dashboard for reproducing storefront issues inside the Ecwid admin preview.

## Highlights

- browser-local diagnostics session with no backend service
- embedded Ecwid preview plus a built-in fake-data demo preview
- JSON export for support handoff
- privacy and support pages hosted with the app

## Validation

- `npm run build`
- `npm run lint`
- `npm test`
- `npm run publish:check`

## Reviewer Notes

- This app does not monitor live shoppers.
- This app does not send telemetry to a server controlled by this repository.
- Settings remain browser-local unless the product requirement changes.
- Support and privacy URLs are hosted on the same static deployment as the app page.

## Hosted URLs

- App page: `https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/index.html`
- Privacy: `https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/privacy.html`
- Support: `https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/support.html`