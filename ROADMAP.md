# 🔮 SwasthyaLink Evolution: Roadmap (v2.0)

This document outlines planned improvements and technical directions for future iterations.

## 🚀 Upcoming Core Features

### 1. 🚲 Smart Routing & Delivery
*   **Dynamic Routing**: Integrated with Mapbox Navigation SDK to calculate optimal delivery paths.
*   **Driver App Integration**: On-demand courier assignment (Lalamove-style) for medicine delivery.
*   **Traffic-Aware ETA**: Real-time traffic data integration for precise arrival estimation.

### 2. 📍 Real-Time Tracking
*   **Live WebSockets**: Enable real-time updates for delivery tracking (Patient side).
*   **Geolocation Updates**: Continuous GPS pings between delivery agent and backend.
*   **Distance-Triggered Notifications**: Geofence alerts when medicine is near.

### 3. 🤖 AI-Powered Health Assistance
*   **Prescription OCR**: Automatic extraction of medical names from handwritten prescriptions (via GPT-4o or similar).
*   **Health Chatbot**: Basic health inquiries and symptom checking (Oracle-style integration).

## 🛠️ Infrastructure Improvements

- [ ] **Data Migrations**: Setup **Alembic** properly for schema evolution without data loss.
- [ ] **Containerization**: Full **Docker** support for both frontend and backend.
- [ ] **Search Engine**: Migration from basic SQL `LIKE` queries to **PostgreSQL Full-Text Search** or **Meilisearch** for medicines.
- [ ] **Caching Layer**: Integration of **Redis** for fast response times on pharmacy queries.

---
**MedConnect Pro**: Link patients with life-saving healthcare resources across Nepal.
