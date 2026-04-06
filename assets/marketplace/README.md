# App Market Assets

This directory now contains the source artwork set for Ecwid App Market submission.

## Status

- icon: ready as `icon.svg`
- listing banner or cover image: ready as `listing-cover.svg`
- dashboard screenshots: ready as runtime-captured PNG exports with SVG source artwork retained

## Included files

- `icon.svg`
- `listing-cover.svg`
- `screenshot-1-dashboard.svg`
- `screenshot-2-demo-preview.svg`
- `screenshot-3-settings.svg`

## Exported raster assets

- `exported/icon-512.png` — 512x512
- `exported/listing-cover-1600x900.png` — 1600x900
- `exported/screenshot-1-dashboard-1600x1000.png` — 1600x1000
- `exported/screenshot-2-demo-preview-1600x1000.png` — 1600x1000
- `exported/screenshot-3-settings-1600x1000.png` — 1600x1000

## Guidance

- use these SVGs as your editable source set, then export them to the exact dimensions required by the current Ecwid App Market form
- the exported screenshot PNG files should always reflect the current runtime UI, not stale concepts or mockups
- avoid artwork that implies live shopper surveillance or centralized telemetry
- keep copy aligned with the actual product: owner-only diagnostics, browser-local settings, and no backend service
- regenerate screenshots with `npm run marketplace:screenshots` while the app is running locally

If Ecwid requires raster uploads for the final listing, export these sources to PNG or JPG and keep the exported files alongside the SVG originals.

The current repo already includes exported PNG files in `assets/marketplace/exported/` using the dimensions above.