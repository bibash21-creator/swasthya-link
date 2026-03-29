# MedConnect Deployment Guide

This guide explains how to deploy MedConnect to Vercel (frontend) and Render (backend).

## Prerequisites

- GitHub account
- Vercel account (free)
- Render account (free)
- Mapbox account (for maps)

## Step 1: Prepare Your Code

### Push to GitHub

1. Create a new GitHub repository
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/medconnect.git
git push -u origin main
```

## Step 2: Deploy Backend to Render

### Option A: Using Render Blueprint (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create:
   - Web service for the backend
   - PostgreSQL database
5. Update the environment variables in the Render dashboard:
   - `ADMIN_EMAIL`: Your admin email
   - `ADMIN_PASSWORD`: Your admin password
   - `ALLOWED_ORIGINS`: Your Vercel frontend URL (after deploying frontend)
   - `MAPBOX_ACCESS_TOKEN`: Your Mapbox token

### Option B: Manual Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: medconnect-api
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4`
   - **Root Directory**: `backend`
5. Add environment variables:
   - `DATABASE_URL`: (Create a PostgreSQL database first, then copy the URL)
   - `SECRET_KEY`: (Generate with `openssl rand -hex 32`)
   - `ADMIN_EMAIL`: Your admin email
   - `ADMIN_PASSWORD`: Your admin password
   - `ENVIRONMENT`: production
   - `DEBUG`: false
   - `ALLOWED_ORIGINS`: Your frontend URL
   - `MAPBOX_ACCESS_TOKEN`: Your Mapbox token
6. Create a disk:
   - **Name**: uploads
   - **Mount Path**: /app/uploads
   - **Size**: 1 GB

### Get Your Backend URL

After deployment, note your backend URL (e.g., `https://medconnect-api.onrender.com`)

## Step 3: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: `https://your-render-url.com/api`
   - `NEXT_PUBLIC_UPLOAD_URL`: `https://your-render-url.com`
   - `NEXT_PUBLIC_APP_URL`: `https://your-vercel-url.vercel.app`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`: Your Mapbox token
6. Click "Deploy"

### Update Backend CORS

After getting your Vercel URL:
1. Go to Render dashboard
2. Update `ALLOWED_ORIGINS` environment variable:
   ```
   https://your-vercel-app.vercel.app,https://www.yourdomain.com
   ```
3. The backend will restart automatically

## Environment Variables Reference

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `SECRET_KEY` | JWT secret key | `your-secret-key` |
| `ADMIN_EMAIL` | Default admin email | `admin@example.com` |
| `ADMIN_PASSWORD` | Default admin password | `secure-password` |
| `ALLOWED_ORIGINS` | Allowed CORS origins | `https://app.vercel.app` |
| `ENVIRONMENT` | Environment name | `production` |
| `DEBUG` | Debug mode | `false` |
| `MAPBOX_ACCESS_TOKEN` | Mapbox API token | `pk.eyJ1...` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.render.com/api` |
| `NEXT_PUBLIC_UPLOAD_URL` | Backend base URL | `https://api.render.com` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `https://app.vercel.app` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox API token | `pk.eyJ1...` |

## Custom Domain (Optional)

### Vercel Custom Domain
1. Go to Vercel project settings
2. Click "Domains"
3. Add your domain and follow verification steps

### Render Custom Domain
1. Go to Render dashboard
2. Select your web service
3. Click "Settings" → "Custom Domains"
4. Add your domain and follow verification steps

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` includes your exact Vercel URL
- Check for trailing slashes (should not have them)

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if database is in the same region as the backend

### File Upload Not Working
- Ensure disk is mounted at `/app/uploads`
- Check disk has available space

### Build Failures
- Check build logs in respective dashboards
- Ensure all environment variables are set
- Verify `requirements.txt` and `package.json` are correct

## Monitoring

- **Render**: Check logs in the Render dashboard
- **Vercel**: Check analytics and logs in Vercel dashboard
- **Health Check**: Visit `https://your-render-url.com/health`

## Updates

To update your deployment:
1. Make changes to your code
2. Commit and push to GitHub
3. Both Render and Vercel will auto-deploy
