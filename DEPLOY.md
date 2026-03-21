# Frammer Agent — Deployment Guide

## Architecture

```
Internet → nginx:80 → backend:8000 (internal)
```

Nginx is the only service that binds to a host port. The backend is isolated inside the `frammer-net` Docker network and is never directly reachable from outside the host.

---

## Prerequisites

- Docker ≥ 24
- Docker Compose v2 (`docker compose`, not `docker-compose`)
- A Groq API key

---

## First-time setup

### 1. Clone and enter the repo

```bash
git clone <your-repo-url>
cd frammer_agent
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in your Groq key:

```
GROQ_API_KEY=gsk_...
```

> `FRAMMER_DATA_DIR` is intentionally absent from `.env` — it is controlled by
> `docker-compose.yml` (`/app`) and should not be overridden.

### 3. Create the host-side volume directories

Docker will create these as root if they don't exist, which causes permission
errors. Create them first:

```bash
ta logsmkdir -p da
```

### 4. Build and start

```bash
docker compose up -d --build
```

---

## Verifying the deployment

```bash
# All containers should show "healthy" / "running"
docker compose ps

# Tail live logs from both services
docker compose logs -f

# Hit the health endpoint through nginx
curl http://localhost/health
```

Expected response: `{"status":"ok"}` (or similar — check your `/health` route).

---

## Day-to-day operations


| Task                      | Command                                |
| ------------------------- | -------------------------------------- |
| Start                     | `docker compose up -d`                 |
| Stop                      | `docker compose down`                  |
| Restart backend only      | `docker compose restart backend`       |
| Rebuild after code change | `docker compose up -d --build backend` |
| View backend logs         | `docker compose logs -f backend`       |
| View nginx logs           | `docker compose logs -f nginx`         |
| Open a shell in backend   | `docker compose exec backend bash`     |


---

## Updating the app

```bash
git pull
docker compose up -d --build backend
```

Nginx does not need rebuilding — it uses a stock `nginx:alpine` image and
mounts `nginx.conf` as a read-only bind mount.

---

## Persisted data


| Host path | Container path            | Contents                                    |
| --------- | ------------------------- | ------------------------------------------- |
| `./data`  | `/app/frammer_agent/data` | Datasets, ChromaDB, SQLite, saved analytics |
| `./logs`  | `/app/frammer_agent/logs` | Daily rotating log files                    |


Deleting `./data` is destructive — back it up before running `docker compose down -v`.

---

## Exposing to the internet

The stack listens on port **80** by default.

### Behind a cloud load balancer / reverse proxy (recommended)

Point your load balancer at the host on port 80. TLS terminates at the load
balancer; no changes to this stack are required.

### Direct TLS with Certbot (optional)

If you want HTTPS on the host itself, add a second server block to `nginx.conf`
for port 443 and mount your certificates:

```nginx
server {
    listen 443 ssl;
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ...
}
```

Then add to the nginx service in `docker-compose.yml`:

```yaml
ports:
  - "80:80"
  - "443:443"
volumes:
  - ./nginx.conf:/etc/nginx/nginx.conf:ro
  - /etc/letsencrypt/live/<domain>:/etc/nginx/certs:ro
```

---

## Firewall checklist

- Port **80** open inbound (and 443 if using TLS)
- Port **8000** should **not** be open — it's internal-only by design

---

## Environment variable reference


| Variable           | Required | Set in               | Description                                      |
| ------------------ | -------- | -------------------- | ------------------------------------------------ |
| `GROQ_API_KEY`     | Yes      | `.env`               | Groq API key for LLM calls                       |
| `API_HOST`         | No       | `docker-compose.yml` | Uvicorn bind host (default `0.0.0.0`)            |
| `API_PORT`         | No       | `docker-compose.yml` | Uvicorn port (default `8000`)                    |
| `FRAMMER_DATA_DIR` | No       | `docker-compose.yml` | Root data path inside container (default `/app`) |


