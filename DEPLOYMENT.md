# Deployment Instructions

This guide outlines the steps required to deploy the **Smart Visitor Management System** to production. The frontend is optimized for **Vercel** and the backend is configured for **Render**.

---

## 1. Prerequisites (Database Setup)

Before deploying either the backend or the frontend, ensure your **MongoDB Atlas** database is configured to accept connections from production hosting servers.

1. Log in to your [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Go to **Network Access** under the **Security** section in the left sidebar.
3. Click **Add IP Address**.
4. Select **Allow Access From Anywhere** (IP address `0.0.0.0/0`).
   > **Note:** Render and Vercel use dynamic outbound IP addresses. Whitelisting `0.0.0.0/0` ensures the backend can always connect to MongoDB Atlas.
5. Go to **Database** (under **Deployment**).
6. Click **Connect** on your cluster, select **Drivers**, and copy the connection string. Replace `<db_password>` with your database user's password.

---

## 2. Deployment Order

1. **Step 1: Deploy Backend (Render)**
   - Deploys first to obtain the production API URL.
2. **Step 2: Deploy Frontend (Vercel)**
   - Needs the backend's production API URL to make requests.

---

## 3. Step-by-Step Deployment

### Step 1: Backend Deployment on Render

1. Log in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the project.
4. Configure the Web Service settings:
   - **Name:** `smart-visitor-backend` (or your preferred name)
   - **Language:** `Node`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free` (or appropriate tier)
5. Under **Environment Variables**, add the following keys (refer to `backend/.env.example`):
   - `PORT`: `5000` (Optional; Render sets this automatically, but setting it explicitly is a good practice)
   - `MONGODB_URI`: *Your MongoDB connection string*
   - `JWT_SECRET`: *A secure, random, long string for signing JWT tokens*
   - `JWT_EXPIRES_IN`: `7d`
   - `CORS_ORIGIN`: *Your production Frontend Vercel URL* (e.g., `https://smart-visitor-frontend.vercel.app`). You can also include localhost for testing separated by a comma (e.g., `https://smart-visitor-frontend.vercel.app,http://localhost:5173`).
6. Click **Deploy Web Service** and copy the deployed URL (e.g. `https://smart-visitor-backend.onrender.com`).

---

### Step 2: Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** and select **Project**.
3. Import your GitHub repository.
4. Configure the Vercel project settings:
   - **Framework Preset:** `Vite` (Vercel detects this automatically)
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand the **Environment Variables** section and add:
   - `VITE_API_URL`: *Your production Backend API URL + `/api`* (e.g. `https://smart-visitor-backend.onrender.com/api`).
6. Click **Deploy**.
7. Once deployed, note down the frontend URL and update the backend's `CORS_ORIGIN` environment variable on Render if it was not already configured.

---

## 4. Post-Deployment Verification

1. Access your deployed Vercel frontend URL.
2. Attempt to log in or register. If you are redirected correctly, the frontend is successfully communicating with the backend database.
3. Navigate to **System Settings** (if available) or check the browser console network logs to verify that calls to `https://your-backend-app.onrender.com/api` return `200 OK`.
