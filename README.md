# Roomio sandbox deploy bundle

Folder structure:

- `web/`: static web build served by Nginx
- `api/`: compiled API build + migrations
- `docker-compose.yml`: runs sandbox web, API, and Postgres together
- `.env.example`: safe template for VPS/runtime config

Run locally or on the frontend VPS:

```bash
cd roomio-sandbox
docker compose up -d
```

If the VPS does not have the Docker images yet, build once during quiet time:

```bash
cd roomio-sandbox
docker compose build
docker compose up -d
```

GitHub Actions CI/CD:

This sandbox repo includes `.github/workflows/deploy.yml`. The workflow syncs this whole folder to the VPS, then runs `docker compose build` and `docker compose up -d` on the VPS.

Required GitHub repository secrets:

- `VPS_HOST`: VPS IP/domain
- `VPS_USER`: SSH user
- `VPS_SSH_KEY`: private SSH key allowed to access the VPS
- `VPS_APP_DIR`: remote folder, for example `/home/ubuntu/roomio-sandbox`

Optional secrets:

- `VPS_PORT`: SSH port, default `22`
- `SANDBOX_ENV_FILE`: full `.env` content to write on each deploy
- `HEALTH_WEB_URL`: default `http://127.0.0.1:8083/`
- `HEALTH_API_URL`: default `http://127.0.0.1:3001/`

If you do not set `SANDBOX_ENV_FILE`, create `.env` manually on the VPS once. The deploy sync excludes `.env`, so normal deploys will not overwrite it.

Default local URLs:

- Web: `http://localhost:8083`
- API health: `http://localhost:3001/`

Public demo login:

- The login page is built with auto-login enabled, so visitors can type anything and press login.
- Behind the scenes it still uses a normal hidden `LANDLORD` demo user so API permissions and demo data work correctly.
- Create that user once from the private Super Admin account before sharing the sandbox link.

Before exposing publicly, copy `.env.example` to `.env` and change at least:

```bash
cp .env.example .env
SANDBOX_POSTGRES_PASSWORD=...
SANDBOX_SESSION_SECRET=...
SANDBOX_PUBLIC_ORIGIN=https://demo.your-domain.com
SANDBOX_SUPER_ADMIN_ACCOUNTS=admin@roomio.local:your-private-admin-password:Roomio Admin
```

Notes:

- The bundle is not aggressively stripped. It keeps the normal static build/assets and compiled API output. The real protection is CPU control, not deleting files.
- On a 1 vCPU VPS, the default sandbox CPU budget is conservative:
  - API: `SANDBOX_API_CPUS=0.30`
  - DB: `SANDBOX_DB_CPUS=0.30`
  - Web/Nginx: `SANDBOX_WEB_CPUS=0.10`
- If the demo feels too slow, raise API/DB a little, for example `0.40` + `0.35`.
- Avoid building on the VPS during demo traffic. If you must rebuild on the VPS, do it during quiet hours, then use `docker compose up -d` for normal restarts.
- Nginx rate-limits `/api` per IP and caches immutable frontend assets, so random clicking should not immediately pin the CPU.
- Keep PayOS/Telegram blank in sandbox unless you intentionally want a real integration.
- If you use R2 for sandbox uploads, prefer a separate bucket or a `sandbox/` public prefix.
- The compose file binds ports to `127.0.0.1` so Cloudflare Tunnel or your host Nginx can expose only the web port.

Repo recommendation:

Keep this sandbox as one repo/folder. Web, API, and DB schema should be deployed as one version-locked demo unit. Splitting repos only makes sense if different teams deploy web/API independently, which is not needed for this sandbox.
