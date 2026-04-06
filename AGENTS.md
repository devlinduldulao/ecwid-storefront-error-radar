# Storefront Error Radar for Ecwid — AI Agent Instructions

> Conventions and patterns for AI coding agents working on this project.
> This file is read automatically by GitHub Copilot, Cursor, Cline, and similar AI assistants.

---

## Project Overview

| Key | Value                                                        |
|-----|--------------------------------------------------------------|
| Plugin Name | storefront-error-radar-ecwid                                 |
| Platform | Ecwid by Lightspeed (SaaS e-commerce widget)                 |
| Architecture | Static owner dashboard + embedded storefront preview          |
| Store API | Ecwid JavaScript widget runtime only                          |
| Storefront API | Ecwid JavaScript API                                         |
| Auth | EcwidApp iframe payload for store context                      |
| Runtime | Static hosting + Node.js only for local tooling               |

---

## Documentation

Refer to the complete documentation in the `docs/` folder:

- [API.md](docs/API.md) — Why this repo has no backend API surface
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Static owner-dashboard architecture
- [DEVELOPMENT.md](docs/DEVELOPMENT.md) — Local workflow for the embedded preview app
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — Static hosting deployment model

---

## Critical Rules

### 1. Ecwid is a SaaS Widget — NOT a Self-Hosted Platform

- **No server-side rendering** — Ecwid renders its own storefront via a JS widget
- **No database access** — This repo intentionally has no persistence beyond browser local storage
- **No PHP/Python templates** — Storefront customisation is CSS + JavaScript
- **No WordPress/Shopify/Magento patterns** — This is NOT WooCommerce, NOT Shopify, NOT Magento

### 2. Product Boundary

| Surface | How to Customize |
|---------|-----------------|
| Owner Dashboard | HTML/JS iframe with EcwidApp SDK |
| Embedded Preview | Ecwid storefront widget inside the dashboard |
| Session Collector | Browser-only JS runtime observers |

### 3. Security Rules

- No secrets in client-side code
- No implied shopper monitoring claims
- Settings stay browser-local unless the product requirement explicitly changes
- CSS scoped to `.ecwid-productBrowser` to prevent style leakage

### 4. Lightspeed Design System & UI Guidelines

When building the native owner dashboard or injecting elements into the storefront, it is **critical** to adhere to the [Lightspeed Brand System](https://brand.lightspeedhq.com/document/170#/brand-system/logo-1) to ensure a native look and feel. E-commerce merchants trust plugins that look like an integrated part of the Ecwid platform.

- **Logo Usage:** Always use the official Lightspeed logo or Flame (brandmark). Ensure proper clearspace (a full flame width for the logo, half flame width for the standalone flame) and minimum size (80px width for logo, 15px for flame).
- **Colors:** 
  - **Charcoal Gray:** Primary choice for logos/text on light backgrounds.
  - **Pure White:** Primary choice on dark backgrounds.
  - **Fire Red:** Used for brand accents (Keep in mind: do NOT overlay the logo on Fire Red as it fails WCAG accessibility guidelines).
- **Accessibility:** All UI components in the app must aim for a **WCAG AA pass or better**. Test background and text color contrast rigorously.
- **Native Components:** Mimic the standard Ecwid control panel styling (fonts, button shapes, input fields, shadows, and spacing) so the app feels like a first-party feature.

---

## File Map

| File | Purpose |
|------|---------|
| `public/index.html` | Ecwid admin iframe page |
| `public/storefront-test.html` | Standalone local preview page |
| `public/app.css` | Dashboard styling |
| `src/shared/diagnostics-core.js` | Session-only diagnostics collector |
| `src/storefront/custom-storefront.js` | Ecwid preview loader and page bridge |
| `src/storefront/custom-storefront.css` | Preview-scoped storefront styling |
| `src/admin/app.js` | Owner dashboard JS |

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `diagnostics-core.js` |
| Variables | camelCase | `storeId` |
| Storage keys | lowercase + separators | `storefront-error-radar:ecwid:123:settings` |
| CSS classes (custom) | prefixed | `.ser-preview-shell` |
| JS API events | PascalCase | `Ecwid.OnPageLoaded` |

---

## Common Mistakes to Avoid

```javascript
// ❌ No database queries — Ecwid has no database access
Product.find({ status: 'active' });          // WRONG
db.query('SELECT * FROM products');          // WRONG

// ❌ No server-side templates
res.render('products/index', { products }); // WRONG

// ❌ No WordPress/WooCommerce/Shopify/Magento patterns
add_action('woocommerce_checkout', fn);      // WRONG
{{ product.title }}                           // WRONG (Liquid)

// ✅ Correct: JS API for the embedded preview
Ecwid.OnPageLoaded.add(function (page) { });

// ✅ Correct: browser-local settings for the owner dashboard
localStorage.setItem('storefront-error-radar:ecwid:123:settings', '{}');
```

---

## Testing Requirements

**Every feature or bug fix MUST include unit tests.** No pull request will be accepted without accompanying tests that cover the new or changed behavior.

- Write unit tests for all new features before marking them complete
- Write unit tests for every bug fix that reproduce the bug and verify the fix
- Aim for meaningful coverage — test business logic, edge cases, and error paths
- Use the project's established testing framework and conventions
- Tests must pass in CI before a PR can be merged

---

## PR/Review Checklist

- [ ] No backend dependencies were reintroduced accidentally
- [ ] Owner-only positioning is still accurate
- [ ] Settings remain browser-local unless explicitly redesigned
- [ ] Storefront JS uses `Ecwid.OnAPILoaded` before accessing API
- [ ] CSS scoped to `.ecwid-productBrowser`
- [ ] Admin dashboard tested inside Ecwid admin iframe
- [ ] Unit tests included for all new features and bug fixes

## Quality Gates

- After any new feature, bug fix, or refactor, always lint, run build, and run test
- Do not consider the task complete until these checks pass, unless the user explicitly asks not to run them or the environment prevents it
- Every new feature must include automated tests that cover the new behavior, including both happy paths and unhappy paths where practical
- Bug fixes should include a regression test when practical
- Refactors must keep existing tests passing and should add tests if behavior changes or previously untested behavior becomes important