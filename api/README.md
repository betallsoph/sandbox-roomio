# Roomio Sandbox API

Minimal runtime bundle for the Roomio API.

This folder intentionally keeps only:

- compiled Node adapter output in `build/`
- Drizzle SQL migrations in `drizzle/`
- production package metadata
- a tiny runtime migration script

It does not include the SvelteKit source, `.svelte-kit`, or `node_modules`.

Recommended: run from the root `docker-compose.yml` so the API, sandbox Postgres, and sandbox web app share one Docker network.
