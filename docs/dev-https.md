# Local HTTPS dev (`epicstory.io`) + Vite HMR (LAN)

This guide enables **trusted HTTPS** on your LAN for camera/mic + websockets, while keeping **Vite HMR** working.

## 1) Map `epicstory.io` to your host machine

On **each device** (host + other laptops/phones), make `epicstory.io` resolve to the host LAN IP (example `192.168.0.4`).

- **Hosts file** (quick)
  - Linux/macOS: `/etc/hosts`
  - Windows: `C:\Windows\System32\drivers\etc\hosts`

Add:

```text
192.168.0.4 epicstory.io
```

## 2) Create a locally trusted certificate (mkcert)

On the **host machine**:

```bash
mkcert -install
mkdir -p certs
mkcert -cert-file certs/epicstory.io.pem -key-file certs/epicstory.io-key.pem epicstory.io
```

### Trust the mkcert root CA on other devices

Other devices must trust the mkcert root CA, otherwise HTTPS will show as untrusted.

On the host, find the root CA location:

```bash
mkcert -CAROOT
```

Copy the root CA cert to your other devices and install it as a **trusted root**.

## 3) Run infra + app + API (docker compose)

From repo root (host machine):

```bash
# One-time: build dev images (installs pnpm deps into the image)
epic build api
epic build app

# Start postgres, redis, peerjs, api, app, and Caddy (HTTPS on https://epicstory.io)
epic run
```

Requires mkcert certs in `./certs` (step 2) for Caddy to serve HTTPS. To start Caddy alone: `epic run caddy`.

If `app` or `api` exit immediately with `Cannot find module .../nest.js` or `.../vite.js`, rebuild the images (`epic build api && epic build app`) and recreate containers (`epic restart --build`).

## 4) Run API locally (debug) — alternative to Docker API

Run your Nest API locally (VS Code `Debug API (Local)` or `pnpm start:debug`) on port `3000`.

Make sure local env points to compose services on localhost:
- `DATABASE_HOST=127.0.0.1`
- `DATABASE_PORT=5432`
- `REDIS_URL=redis://127.0.0.1:6379`

## 5) Run the app locally (Vite)

From `app/`:

```bash
pnpm dev
```

## 6) Run Caddy as the HTTPS reverse proxy

From repo root (pick one):

### Option A — Caddy installed locally

```bash
caddy run --config Caddyfile.dev --adapter caddyfile
```

### Option B — Caddy via Docker Compose (Linux)

This runs Caddy in a container but proxies to your **locally-running** Vite/API via `network_mode: host`.

```bash
docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d caddy
```

Logs:

```bash
docker logs -f epicstory-caddy
```

Now open:
- `https://epicstory.io`

## 8) Expose `https://epicstory.io` over ngrok

If you already have `epicstory.io` in `/etc/hosts` and Caddy is configured with a site block for `epicstory.io`, you must make ngrok send `Host: epicstory.io` so Caddy selects the correct site.

From repo root (with Caddy running on port 443):

```bash
# Start ngrok tunnel → local Caddy (:443), rewriting Host to epicstory.io
epic ngrok
```

If you prefer calling ngrok directly:

```bash
ngrok start epicstory --config ./ngrok.epicstory.yml --config default
```

## 7) Verify Vite HMR

- Open DevTools → Network → WS
- You should see a persistent `wss://epicstory.io/...` connection for HMR
- Edit a frontend file and confirm it updates without a full reload

## Troubleshooting

- **Camera/mic still blocked**: confirm the cert is trusted on that device and the URL is `https://epicstory.io` (not an IP).
- **HMR websocket fails**: check Vite `server.hmr` settings and that Caddy is proxying `/` to Vite.
- **API calls fail**: confirm API is reachable via `https://epicstory.io/api/...` (Caddy route).

