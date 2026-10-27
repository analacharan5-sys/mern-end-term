# QueueLess Deployment Guide

This guide covers deployment procedures, runtime requirements, MongoDB concurrency configurations, and environment setup for production.

---

## 1. Prerequisites & Runtime Requirements

- **Node.js**: v18.0.0 or higher (Tested with Node.js 24)
- **MongoDB**: v4.4 or higher (MongoDB 7.0 recommended)
- **Process Manager**: PM2, systemd, or Docker container runner
- **Reverse Proxy**: NGINX, Caddy, or AWS ALB for SSL termination

---

## 2. MongoDB Deployment Strategy & Transaction Requirements

QueueLess implements an **Atomic Conditional Reservation Strategy** at the database layer:

### Standalone MongoDB Deployments
- QueueLess utilizes atomic conditional updates (`findOneAndUpdate` with `$expr: { $lt: ['$bookedCount', '$capacity'] }` and atomic `$inc`).
- Single-document atomic operations work reliably on **standalone MongoDB instances** without replica sets.
- If appointment creation fails following an atomic slot reservation, a compensating atomic decrement rollback is executed.

### Enterprise Replica Set & Multi-Document Transactions
- If strict multi-document ACID transactions across multiple collections (`AvailabilitySlots` and `Appointments`) are required by your institutional policy, **MongoDB must be deployed as a Replica Set** (or on MongoDB Atlas).
- Standalone MongoDB instances do not support multi-document transactions.
- To convert a local standalone MongoDB instance to a replica set:
  ```bash
  mongod --port 27017 --dbpath /data/db --replSet rs0
  ```
  Initiate once via `mongosh`:
  ```javascript
  rs.initiate()
  ```

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` in the backend directory:
```bash
cp .env.example backend/.env
```

| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port for the Express application | `5000` |
| `NODE_ENV` | Environment identifier | `production` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/queueless?retryWrites=true&w=majority` |
| `JWT_SECRET` | 32+ character random cryptographic secret | Generated via `openssl rand -hex 32` |
| `CLIENT_URL` | Allowed origin for CORS & cookie sharing | `https://queueless.campus.edu` |

> [!CAUTION]
> In production (`NODE_ENV=production`), cookies are set with `Secure: true`. Ensure your application runs behind an HTTPS connection (or reverse proxy with SSL termination).

---

## 4. Production Build & Execution

### Step 1: Install Dependencies
```bash
npm install --prefix backend
npm install --prefix frontend
```

### Step 2: Build the Frontend Static Assets
```bash
npm run build --prefix frontend
```
The compiled SPA assets will be placed in `frontend/dist/`. The Express backend is pre-configured in `backend/src/app.js` to automatically serve this directory as static files in production.

### Step 3: Run Database Migrations / Automated Seed
When the server starts for the first time, it automatically creates initial campus departments (Academic Advising, Financial Aid, Health Center, Registrar, Career Services), sample availability slots, and default test administrator / student accounts:
- **Admin**: `admin@campus.edu` / `AdminPass123!`
- **Student**: `student@campus.edu` / `StudentPass123!`

### Step 4: Start the Production Server with PM2
```bash
npm install -g pm2
pm2 start backend/src/server.js --name "queueless-app"
pm2 save
```

---

## 5. Reverse Proxy Configuration (NGINX Example)

```nginx
server {
    listen 80;
    server_name queueless.campus.edu;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name queueless.campus.edu;

    ssl_certificate /etc/letsencrypt/live/queueless.campus.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/queueless.campus.edu/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 6. Pre-Flight Verification Checklist

Before publishing QueueLess to campus staff and students, verify:
- [x] Run automated test suite: `npm test --prefix backend` (All 25 tests pass).
- [x] Production build passes: `npm run build --prefix frontend`.
- [x] `JWT_SECRET` is set to a private random key (not the default fallback).
- [x] `NODE_ENV` is set to `production`.
- [x] HTTPS is active for `HttpOnly` and `Secure` cookie transport.
- [x] Rate limiting is enabled on sensitive endpoints.
- [x] MongoDB database user has least-privilege readWrite role.
