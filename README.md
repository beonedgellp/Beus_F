# Beus — Frontend (Beus_F)

React + TypeScript (Vite) client for the Beus team app. Pairs with the
backend in **Beus_B**.

## Features

- **Sign in** with your team email + password (only allow-listed emails work).
- **Forced password change** on first login (replaces the shared starting
  password).
- **Chat** — real-time messages and pictures over WebSockets; delete your own
  messages.
- **Collective space** — upload safe file types, tag them with a coloured
  label + heading, download, delete.
- **Personal space** — your private files, plus create/revoke **share links**
  so outsiders can download a specific file.
- **Public share page** at `/shared/:token` for recipients.

## Run everything in Docker (recommended)

The easiest way to run the full app (this frontend + the backend + MongoDB) is
via Docker. The frontend ships with a `Dockerfile` (Vite build served by
nginx, with SPA fallback) that is orchestrated from the **Beus_B** repo's
`docker-compose.yml`. See **Beus_B/DOCKER.md**. In short, from the `Beus_B`
folder next to this one:

```bash
cp .env.docker.example .env
docker compose up -d --build   # frontend :5173, backend :4000
```

## Setup (running natively)

```bash
cp .env.example .env      # set VITE_API_URL to your backend URL
npm install
npm run dev               # http://localhost:5173
npm run build             # production build to dist/
```

## Environment

- `VITE_API_URL` — base URL of the backend (default `http://localhost:4000`).

## Routes

| Path | Page |
|------|------|
| `/login` | Sign in |
| `/change-password` | Set a new password |
| `/chat` | Team chat |
| `/collective` | Shared files |
| `/personal` | Private files + sharing |
| `/shared/:token` | Public download page |
