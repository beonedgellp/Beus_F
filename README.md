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

## Setup

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
