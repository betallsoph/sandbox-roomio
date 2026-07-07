# Roomio Sandbox Web

Minimal static web bundle for Roomio.

This folder intentionally keeps only:

- generated static files in `html/`
- Nginx config for SPA fallback and `/api` proxy
- a small runtime Dockerfile

It does not include frontend source, `.svelte-kit`, or `node_modules`.

Recommended: run from the root `docker-compose.yml` so `/api` proxies to the sandbox API container.
