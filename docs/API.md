# API Reference

This project does not expose a backend API.

## What exists instead

- Ecwid admin iframe page at `public/index.html`
- Standalone local preview page at `public/storefront-test.html`
- Browser-local settings persisted with `localStorage`
- JSON export generated in the browser

## Why there is no API

The current Ecwid product target is an owner-only diagnostics dashboard that avoids databases, servers, and webhook infrastructure. Because of that, there are no REST endpoints to document in this repo.

If a future version introduces shared settings or centralized incident retention, this document should be rewritten together with the backend implementation.
