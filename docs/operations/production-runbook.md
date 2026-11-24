# Production Runbook

Operational notes for `docker-compose.prod.yml` (ADR 0017). Commands assume the repo root and a filled-in `.env`
(copy `.env.example`; `POSTGRES_PASSWORD` is mandatory).

## Topology and constraints

- `frontend` (nginx) is the only published port (`FRONTEND_PORT`, default 80). It serves the SPA and proxies
  `/api/` and `/hubs/` to `backend:5000`. The backend, Postgres and Redis are not published.
- **Run exactly one `backend` replica.** Room state lives in the backend process memory (single-writer loop,
  ADR 0003); the Redis backplane only fans out SignalR messages and stores room metadata. A second replica would
  split rooms across processes. Do not use `docker compose up --scale backend=N`.
- `/healthz` and `/readyz` are **not** exposed through nginx. `/readyz` opens a database connection and is not
  covered by the rate limiter, so a public route would be a cheap DoS vector. The container healthcheck calls it
  on `127.0.0.1:5000` inside the backend container; from the host use
  `docker compose -f docker-compose.prod.yml exec backend dotnet Overclock.Host.dll --healthcheck; echo $?`.

## TLS

The bundled nginx listens on plain HTTP and sends `Strict-Transport-Security`, which browsers honour only over
HTTPS. Terminate TLS in front of it, one of:

1. **Cloudflare Tunnel** (matches `frontend/nginx-real-ip.conf`): run `cloudflared` on the same Docker network
   or host, point it at `http://frontend:80`. The real client IP comes from `CF-Connecting-IP`, trusted only from
   Cloudflare ranges and private networks.
2. **Caddy / another reverse proxy**: proxy to `frontend:80`, forward `Upgrade`/`Connection` for `/hubs/`, and
   replace `nginx-real-ip.conf` with `real_ip_header X-Forwarded-For` plus `set_real_ip_from <proxy address>`.
   Without that, every player appears to share the proxy's IP and the per-IP rate limit hits them together.

3. **Tailscale Funnel** (stable `https://<machine>.<tailnet>.ts.net`, players need no Tailscale): see below.

`nginx-real-ip.conf` assumes Cloudflare. If you are not behind Cloudflare, change it before going live.

### Tailscale Funnel

The bundled nginx already serves the SPA, `/api/` and `/hubs/` on one port, which is what Funnel needs
(it exposes a single public HTTPS port and supports WebSockets).

1. In `.env`: `FRONTEND_PORT=3000` and `REAL_IP_CONF=./frontend/nginx-real-ip-tailscale.conf`. The second setting
   is essential: the Cloudflare file reads `CF-Connecting-IP`, which Funnel never sends, so every player would
   share one IP and one per-IP rate-limit bucket (e.g. 5 new rooms per minute for everybody).
2. `docker compose -f docker-compose.prod.yml up -d --build`, wait until `backend` is `healthy`.
3. Enable HTTPS and Funnel for the machine in the Tailscale admin console, then `sudo tailscale funnel 3000`.
4. Check the real IP: open the game from a phone on mobile data, then
   `docker compose -f docker-compose.prod.yml logs frontend | tail` must show the phone's public address, not
   `127.0.0.1` or `172.x`. If it shows a local address, Funnel is not sending `X-Forwarded-For` as expected; fix
   that before inviting players.

## Backup and restore (PostgreSQL)

Postgres holds match statistics only (the `stats` schema); live rooms are in memory and lost on restart.

```bash
# Backup (custom format, compressed); keep copies off the host.
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-overclock}" -d "${POSTGRES_DB:-overclock}" -Fc \
  > "backup-$(date +%F).dump"

# Restore into an empty database.
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "${POSTGRES_USER:-overclock}" -d "${POSTGRES_DB:-overclock}" --clean --if-exists \
  < backup-YYYY-MM-DD.dump
```

Schedule the backup (cron/systemd timer, daily) and test a restore at least once. Redis is a cache and backplane
only (all keys have a TTL); it needs no backup.

## Deploy and rollback

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps        # backend must become "healthy"
```

Restarting the backend drops all in-progress games. Deploy outside peak hours. Roll back by checking out the
previous tag and re-running the commands above; the Stats migration is applied at startup and is additive.
