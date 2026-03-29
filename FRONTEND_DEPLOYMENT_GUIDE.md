# Frontend Deployment Guide (Vercel)

Now that your database and backend are live (at `https://swasthya-link-api.onrender.com/`), follow these steps to put your frontend live on Vercel properly.

## 1. Update Backend CORS (on Render)
The backend needs to trust your Vercel URL.
1. Go to your **Render Dashboard**.
2. Select your **swasthya-link-api** service.
3. Click on **Environment**.
4. Find the `ALLOWED_ORIGINS` variable.
5. Add your Vercel deployment URL to the list (comma-separated).
   - If you don't know it yet, you can add `https://*.vercel.app` to allow all Vercel previews temporarily.
   - For example: `http://localhost:3000,https://swasthya-link.vercel.app,https://*.vercel.app`

## 2. Deploy Frontend to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your GitHub repository.
4. In the configuration:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Next.js`
5. Click **Environment Variables** and add these:
   - `NEXT_PUBLIC_API_URL`: `https://swasthya-link-api.onrender.com/api`
   - `NEXT_PUBLIC_UPLOAD_URL`: `https://swasthya-link-api.onrender.com`
   - `NEXT_PUBLIC_APP_URL`: `https://your-vercel-domain.vercel.app` (The domain Vercel gives you)
6. Click **Deploy**.

## 3. Post-Deployment Verification
- Ensure you can log in / sign up.
- Test prescription uploads (ensuring it talks to the Render URL).
- Check the map functionality.

---
*Note: We have optimized your `frontend/vercel.json` and `frontend/next.config.ts` to be fully compatible with Vercel's standard Next.js deployment.*
