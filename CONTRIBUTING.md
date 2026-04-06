# Contributing

## Getting Started

1. Clone the repo
2. Run `npm install`
3. Run `npm run dev`
4. Open `public/storefront-test.html?storeId=YOUR_STORE_ID`

## Development Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Run `npm run lint` to check for issues
4. Run `npm test` to cover the jsdom-backed unit, integration, and smoke suites
5. Run `npm run publish:check` when your change touches support, privacy, deployment, or App Market assets
4. Commit with conventional commit messages:
   - `feat: add preview export filter`
   - `fix: handle pagination edge case`
   - `docs: update API reference`
6. Push and open a PR

## Code Style

- Use `const` and `let`, never `var`
- Prefer `async/await` over raw Promises
- Keep functions small and focused
- Add JSDoc comments for public APIs
- Follow the naming conventions in AGENTS.md

## Adding New Features

- **New diagnostics behavior:** Edit `src/shared/diagnostics-core.js`
- **Ecwid preview behavior:** Edit `src/storefront/custom-storefront.js`
- **Preview styling:** Edit `src/storefront/custom-storefront.css`
- **Admin dashboard feature:** Edit `public/index.html`, `public/app.css`, and `src/admin/app.js`

## Important Rules

- Do not introduce backend dependencies unless the product requirement changes
- Keep the app owner-facing; do not quietly switch to visitor monitoring
- Keep runtime assets static-host friendly
- Scope CSS to `.ecwid-productBrowser`
- Use `Ecwid.OnAPILoaded` before calling JS API methods

## Publishing Changes

- Update `assets/marketplace/` if you change listing visuals
- Keep `public/support.html` and `public/privacy.html` deploy-safe; do not link them to local-only files
- Use `docs/RELEASE_TEMPLATE.md` when preparing GitHub releases or Ecwid reviewer notes
- Open the `Publish Submission Checklist` issue template before turning on the live listing
