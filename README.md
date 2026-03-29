# SwasthyaLink (MedConnect Pro)

**SwasthyaLink** is a comprehensive medical ecosystem platform designed to connect patients with pharmacies and healthcare providers in Nepal. It offers prescription management, medicine inventory tracking, and location-based pharmacy discovery.

## 🚀 Features

- **📍 Smart Pharmacy Discovery**: Locate pharmacies near you with real-time distance calculation.
- **📄 Prescription Management**: Upload and track prescriptions; get notified when they are fulfilled.
- **💊 Inventory Tracking**: Pharmacies can manage medicine stock and update availability.
- **🛡️ Secure Auth**: JWT-based authentication for patients, pharmacies, and admins.
- **📦 Order System**: Integrated ordering for medicines and healthcare services.
- **🩺 Health Services**: Beyond medicines, pharmacies can list services like diagnostic tests.

## 📁 Repository Structure

```text
.
├── backend/               # FastAPI Backend Service
│   ├── app/               # Core application logic
│   │   ├── api/           # API Endpoints (v1)
│   │   ├── core/          # Configuration & Auth logic
│   │   ├── db/            # Database models & sessions
│   │   └── main.py        # FastAPI instance root
│   ├── scripts/           # Utility & maintenance scripts
│   ├── main.py            # Local development entry shim
│   ├── render.yaml        # Render.com deployment config
│   └── requirements.txt   # Python dependencies
├── frontend/              # Next.js Frontend Application
│   ├── src/               # Application source
│   ├── public/            # Static assets
│   ├── next.config.ts     # Next.js configuration
│   └── vercel.json        # Vercel deployment config
└── DEPLOYMENT.md          # Multi-platform deployment guide
```

## 🛠️ Local Development

### Backend
1. **Navigate**: `cd backend`
2. **Env**: Copy `.env.example` to `.env` and fill values.
3. **Run**: `uvicorn main:app --reload`

### Frontend
1. **Navigate**: `cd frontend`
2. **Env**: Copy `.env.example` to `.env.local` and fill values.
3. **Install**: `npm install`
4. **Run**: `npm run dev`

## 🌍 Deployment

- **Backend**: Pre-configured for **Render** (via `render.yaml`).
- **Frontend**: Pre-configured for **Vercel** (via `vercel.json`).

For detailed deployment steps, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🔮 Future Roadmap (v2.0)
Check [ROADMAP.md](./ROADMAP.md) for planned features including smart routing and real-time ETAs.

## 📜 License
This project is licensed under the MIT License.
