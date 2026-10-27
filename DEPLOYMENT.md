# QueueLess Production Deployment & Hosting Guide

This guide provides step-by-step instructions for deploying QueueLess to production (specifically on **Render**, **Railway**, or a standard VPS/cloud server with **MongoDB Atlas**).

---

## 1. Quick-Start Deployment Options Overview

| Platform | Deployment Type | Cost | Setup Time | Recommended For |
| :--- | :--- | :--- | :--- | :--- |
| **Render (Recommended)** | **Single Full-Stack Web Service** | **Free** | **5 minutes** | End-term project submission, 1-click GitHub deploy |
| **Railway** | Single Full-Stack Web Service | Free trial / \$5 | 5 minutes | Alternative modern PaaS deploy |
| **Self-Hosted VPS** | PM2 + Nginx Reverse Proxy | Varies | 20 minutes | Dedicated server / institutional hosting |

> [!NOTE]
> **Single Full-Stack Architecture**: QueueLess is architected so that the Express backend automatically serves the compiled React SPA (`frontend/dist`) on the same domain and port (`/`). This eliminates all cross-origin (CORS) complexity and ensures `HttpOnly` session cookies and `XSRF-TOKEN` cookies work with zero configuration.

---

## 2. Step 1: Configure MongoDB Atlas (Crucial)

Before deploying your app to any cloud provider, your MongoDB Atlas cluster must allow connections from cloud servers:

1. Open [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
2. In the left navigation menu under **Security**, click **Network Access**.
3. Click the green **`+ Add IP Address`** button.
4. Click **`Allow Access from Anywhere`** (this sets `0.0.0.0/0`).
   > *Why this is required*: Cloud platforms like Render and Railway use dynamic outbound IP addresses that change on each deploy. `0.0.0.0/0` ensures your cloud service can connect without being blocked.
5. Click **Confirm**. Wait 30 seconds for the status to show **Active**.
6. In the left navigation menu under **Security**, click **Database Access** and confirm you have a user with `Read and write to any database` privileges.
7. Copy your connection string from **Database** -> **Connect** -> **Drivers** (Node.js):
   ```text
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/queueless?retryWrites=true&w=majority
   ```

---

## 3. Step 2: Push Your Code to GitHub

Make sure your repository has no exposed `.env` files or secrets before pushing:

1. Verify `.gitignore` ignores `.env` and `*.env`:
   ```bash
   git status
   ```
2. Commit your updated project code:
   ```bash
   git add .
   git commit -m "Prepare QueueLess for production deployment"
   ```
3. Create a new repository on [GitHub](https://github.com/new) named `queueless` (or your preferred name).
4. Link and push your local branch:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
   git branch -M main
   git push -u origin main
   ```

---

## 4. Step 3: Deploy on Render (Recommended - Free & 5 Minutes)

Render provides a free web service tier that connects directly to your GitHub repository.

### Option A: Using the Included Blueprint (`render.yaml`)
1. Go to [Render.com](https://render.com/) and log in with your GitHub account.
2. In the top-right header, click **New +** and select **Blueprint**.
3. Select your GitHub repository (`queueless`).
4. Render will detect the `render.yaml` file in the root.
5. When prompted for environment variables:
   - **`MONGO_URI`**: Paste your MongoDB Atlas connection string.
   - **`JWT_SECRET`**: (Auto-generated automatically by Render, or paste a 64-character random string).
6. Click **Apply**.
7. Render will build the React frontend, start the Express backend, and provide your live URL (e.g. `https://queueless-xyz.onrender.com`).

---

### Option B: Manual Web Service Setup on Render
If you prefer configuring the Web Service manually:
1. In Render, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `queueless` (or any unique name)
   - **Region**: Oregon (US West) or Frankfurt
   - **Branch**: `main` (or `master`)
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: `Free`
4. Scroll down to **Environment Variables** and add:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = `mongodb+srv://<username>:<password>@cluster0.porz8dd.mongodb.net/queueless?retryWrites=true&w=majority`
   - `JWT_SECRET` = *(any secure random string, e.g. 64 random characters)*
5. Click **Create Web Service**.
6. Wait for the build and deployment logs to finish. When you see:
   ```text
   QueueLess Backend Server running on port 10000
   [Database] Successfully connected to MongoDB Atlas
   ```
   Your app is live! Click the URL at the top left (e.g. `https://queueless.onrender.com`).

---

## 5. Step 4: Alternative Deploy on Railway

1. Go to [Railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your `queueless` repository.
4. Click **Add Variables** and configure:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = `mongodb+srv://<username>:<password>@cluster0.porz8dd.mongodb.net/queueless?retryWrites=true&w=majority`
   - `JWT_SECRET` = `a93b48f9d0c841e2b58d927a3c7e41b9d4829fa18e0349b12854930182470123`
5. Railway will automatically run `npm run build` and `npm start`.
6. Go to **Settings** -> **Networking** -> **Generate Domain** to get your public live URL (e.g. `https://queueless-production.up.railway.app`).

---

## 6. Step 5: Post-Deployment Verification (Submission Checklist)

Once your live URL is online, test and verify these workflows before submitting:

### 1. Initial Accounts Seed Check
On first launch, the server automatically initializes:
- **Test Admin**:
  - Email: `admin@campus.edu`
  - Password: `AdminPass123!`
- **Test Student**:
  - Email: `student@campus.edu`
  - Password: `StudentPass123!`

### 2. Verify Student Workflow
1. Navigate to your live URL (e.g. `https://queueless.onrender.com`).
2. Log in as `student@campus.edu` / `StudentPass123!` (or click Register to create a new student account).
3. Browse the **Campus Services Directory** (Academic Advising, Financial Aid, Health Center, Registrar, Career Services).
4. Select a department and view open slots.
5. Click **Book** on an available slot, enter an optional note, and click **Confirm Booking**.
6. Confirm the green reservation modal displays with your assigned **Queue Ticket #** (e.g. `#1`).
7. Open **My Appointments** to see your active reservation.
8. Click **Live Queue** to view real-time queue position and estimated wait time.

### 3. Verify Admin Workflow
1. Log out, then log in as `admin@campus.edu` / `AdminPass123!`.
2. Access the **Admin Portal** in the navigation bar.
3. Check **Service Management**: create or edit an active service.
4. Check **Slot Management**: generate consecutive slots in bulk.
5. Check **Desk Operations / Queue Transitions**:
   - Transition student status: `Booked` -> `Check In` -> `Complete`.
6. Check **Analytics & Reports**:
   - Verify service utilization percentages, total bookings, completed visits, and no-shows with date filtering.

---

## 7. Submission Form Checklist

Before filling out your End-Term Project submission form:

- [ ] **GitHub Repository URL**: Public repository containing all clean source code.
- [ ] **No Secrets Exposed**: Confirmed `.env` and database passwords are not committed.
- [ ] **Live Deployed URL**: Accessible `https://...` link running on Render or Railway.
- [ ] **Demo Video**: Record a 3 to 5-minute walkthrough demonstrating:
  1. Student registration / login.
  2. Browsing campus services and selecting a slot.
  3. Booking confirmation with queue ticket assignment.
  4. Live queue tracking and dynamic wait time.
  5. Admin login, slot creation, desk check-in / completion, and analytics dashboard.
- [ ] **Test Report**: Mention that 25 automated backend test suites pass with 0 errors (`npm test`).
