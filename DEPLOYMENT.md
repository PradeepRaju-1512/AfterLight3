# AFTERLIGHT — Deployment Guide

AFTERLIGHT runs on a Node.js Express server + React frontend backed by a pure C++ 17 native engine (`engine_cli`) and SQLite.

---

## 1. Deploying to Render.com

Render supports Node.js web services with native toolchains.

### Option A: Using `render.yaml` Blueprint (Recommended)
1. Push this repository to GitHub or GitLab.
2. In Render dashboard, click **New +** > **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml` and configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node.js, `PORT=10000`, `NODE_ENV=production`
4. Click **Apply**.

### Option B: Manual Web Service Setup on Render
1. In Render dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the following settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
5. Click **Create Web Service**.

---

## 2. Deploying with Docker

You can run AFTERLIGHT in any container platform (AWS ECS, Google Cloud Run, Fly.io, Railway, DigitalOcean):

```bash
# Build the image
docker build -t afterlight:latest .

# Run container on port 3000
docker run -d -p 3000:3000 --name afterlight-app afterlight:latest
```

---

## 3. Local Development & Engine Verification

```bash
# 1. Compile C++ engine
bash backend/cpp/build.sh

# 2. Run C++ test suite (34 tests)
npm run test:engine

# 3. Start development server
npm run dev
```
