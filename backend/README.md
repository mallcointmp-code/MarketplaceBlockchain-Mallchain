# Marketplace Backend (Node/Express)

Quick start:

1. copy `.env.example` to `.env` and fill values (MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_*)
2. install deps:

```bash
cd backend
npm install
```

3. run in dev:

```bash
npm run dev
```

API endpoints:
- `GET /api/health` health check
- `POST /api/auth/register` { email, password }
- `POST /api/auth/login` { email, password }
- `GET /api/auth/google` OAuth start
- `GET /api/auth/google/callback` OAuth callback
- `GET /api/protected` JWT-protected route (Authorization: Bearer <token>)

