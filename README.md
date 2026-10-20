# 🌾 AgriSense AI — Smart Autonomous Precision Agriculture Platform
### *Official Submission for Bharat Innovation Challenge 2026*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.0-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg?style=flat&logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-success.svg)]()

> **AgriSense AI** is a production-grade, full-stack precision agritech platform designed to empower smallholder Indian farmers with automated closed-loop irrigation, real-time Soil Health Indexing (SHI), live government mandi price benchmarking, distributed dual-ESP edge hardware, and multimodal AI agronomist advisory in native regional languages.

---

## 📽️ Bharat Innovation Challenge 2026 Pitch Deck

* 📊 **PowerPoint Presentation (.pptx)**: [`AgriSense_Bharat_Innovation_Challenge_2026.pptx`](./AgriSense_Bharat_Innovation_Challenge_2026.pptx)
* 🖥️ **Interactive Web Slide Viewer**: Open [`frontend/public/bharat_challenge_deck.html`](./frontend/public/bharat_challenge_deck.html) in any modern browser for full-screen keyboard navigation ($\leftarrow / \rightarrow$).

---

## ⚡ Distributed Dual-ESP Hardware Architecture

AgriSense partitions field edge computing across two dedicated microcontroller nodes for maximum reliability and zero telemetry interruption:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 AgriSense Full-Stack                    │
                  │   (React 19 Dashboard · Cloudflare Pages · FastAPI)     │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
         ┌───────────────────────────┐                   ┌───────────────────────────┐
         │     ESP32 DevKit V1       │                   │         ESP32-S3          │
         │   (Dedicated Sensor Hub)  │                   │  (Dedicated AI Vision)    │
         ├───────────────────────────┤                   ├───────────────────────────┤
         │ • DHT11 (Air Temp & Hum)  │                   │ • 32 MB Octal PSRAM       │
         │ • Dual Soil Moisture (1&2)│                   │ • OV2640 / GC2145 Camera  │
         │ • LDR Solar & Rain Probes │                   │ • High-Speed MicroSD Slot │
         │ • Active-LOW Relays       │                   │ • Multi-Spectral AI Model │
         │ • 2-Way Google Sheets     │                   │ • Port 81 MJPEG Live Stream│
         │ • Web Serial Fallback     │                   │ • Direct Website Scan API │
         └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                       │                                               │
                       │ (GET /sts=write every 3.5s)                   │ (REST capture & AI)
                       ▼                                               ▼
         ┌───────────────────────────┐                   ┌───────────────────────────┐
         │       Google Sheets       │                   │    AgriSense Dashboard    │
         │   (Cloud Telemetry Hub)   │◄──────────────────┤    (Crop Scan & Lab)      │
         └───────────────────────────┘  (Polls every 4s) └───────────────────────────┘
```

### Node 1: ESP32 DevKit V1 — Dedicated Sensor Hub & Google Sheets Ingest
* **Firmware**: [`firmware/agrisense_devkit_v1_sensors_sheets.ino`](./firmware/agrisense_devkit_v1_sensors_sheets.ino)
* **Pin Mapping**:
  * DHT11 Temperature & Humidity: `GPIO 4`
  * Soil Moisture Sensor 1: `GPIO 34` (Analog ADC1)
  * Soil Moisture Sensor 2: `GPIO 35` (Analog ADC1)
  * LDR Solar / Light Sensor: `GPIO 32` (Analog ADC1)
  * Raindrop Precipitation Sensor: `GPIO 33` (Analog ADC1)
  * Submersible Pump Relay: `GPIO 25` (Active LOW)
  * Cooling Fan Relay: `GPIO 26` (Active LOW)
* **Google Sheets Telemetry Bridge**:
  * Pushes calibrated sensor packets every 3.5 seconds to Google Apps Script.
  * Ingests remote manual pump/fan override commands returned in the HTTP response.
  * Web app polls the Google Sheets webhook every 4.5 seconds to display live hardware state.
* **Autonomous Edge Failsafe**:
  * Automatically shuts down irrigation if soil moisture exceeds 85% or if continuous pump runtime exceeds 15 minutes.

### Node 2: ESP32-S3 — Dedicated 32MB PSRAM AI Vision Node
* **Firmware**: [`firmware/agrisense_s3_ai_vision_node.ino`](./firmware/agrisense_s3_ai_vision_node.ino)
* **Memory & Storage**:
  * Harnesses full **32 MB PSRAM** for triple frame buffering (`fb_count = 3`, `UXGA 1600x1200`) and image transformation matrices.
  * High-speed **MicroSD Slot** (`SD_MMC` on GPIO 38, 39, 40) automatically saves all raw leaf images (`/scans/scan_*.jpg`) and diagnostic JSON logs.
* **On-Chip Multi-Spectral Foliar Vision Engine (MSSM-FC)**:
  * Superior to basic 96x96 MobileNet TFLite by operating directly on high-resolution PSRAM color matrices.
  * Uses Excess Green Index ($ExG = 2G - R - B$) and Visible Atmospheric Resistance Index (VARI) for foliage segmentation.
  * Detects concentric halo target spots (Alternaria Early Blight), water-soaked irregular necrosis (Phytophthora Late Blight), powdery sporulation, and nutritional chlorosis.
* **Direct Web Integration**:
  * Port 81: High-speed live MJPEG video stream (`http://<S3_IP>:81/stream`).
  * Port 80: REST endpoints (`/capture.jpg`, `/ai/diagnose`, `/control`, `/status`, `/sd/list`).
  * One-click "📸 Capture from S3" directly inside the web dashboard.

---

## 💧 Defensible Water Conservation Model

AgriSense replaces arbitrary static estimates with a verified agricultural micro-irrigation efficiency model:

* **Precision Drip Delivery**:
  $$\text{Drip Volume (L)} = \text{Pump Runtime (min)} \times \text{Calibrated Flow Rate (25 L/min)}$$
* **Flood Baseline Conservation**:
  Conventional furrow/flood irrigation operates at ~38% efficiency due to deep percolation and evaporation. Precision drip operates at ~92% efficiency.
  $$\text{Conserved Volume} = \text{Drip Volume} \times 1.45 \quad (\approx 61\%\text{ water saved})$$
* **Sensor & Weather Hold Savings**:
  When rain is forecast/detected or soil moisture is at field capacity (>55%), automated logic holds back scheduled irrigation bursts, crediting ~190 L/acre per cycle.
* **Interactive Audit**: Tapping the `Water saved today` card opens a full operational breakdown modal.

---

## 🏛️ Government Schemes & Dynamic Agromet Advisories

* **State-Filtered Central & State Schemes**: Interactive filtering across National (PM-KISAN, PMFBY, KCC, Soil Health Card, PM-KUSUM) and state-specific programs (Punjab CRM, MahaDBT, Haryana, Karnataka). Every scheme links directly to official government portals with verified deadlines and required document checklists.
* **Contextual Weather Advisories**: Real-time synthesis of Open-Meteo forecasts with active farm sensors and crop growth stage. Clearly distinguishes official IMD Agromet alerts from AgriSense sensor recommendations.
* **Structured AI Farm Report Feedback**: Farmer-in-the-loop evaluation form (utility, diagnosis accuracy, actions tried, outcome, user corrections) archived with model version metadata for agronomic review.

---

## 🚀 Quickstart & Development

### 1. Backend Setup (FastAPI + Python 3.12+)

```powershell
# Navigate to backend
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Launch FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

* **Interactive API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Backend Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 2. Frontend Setup (React 19 + TypeScript + Vite)

```powershell
# Navigate to frontend
cd frontend

# Install node dependencies
npm install

# Start development server
npm run dev
```

* **Live Dashboard**: [http://localhost:5173/app.html](http://localhost:5173/app.html)
* **Presentation Deck**: [http://localhost:5173/bharat_challenge_deck.html](http://localhost:5173/bharat_challenge_deck.html)

### 3. Build & Production Deployment

```powershell
cd frontend
npm run build
```
Vite compiles the production bundle into `dist/` and copies `app.html` directly into `dist/app.html`.

---

## 📄 License & Attribution
Developed with ❤️ for Indian Farmers. Released under the **MIT License**.
* Official submission for **Bharat Innovation Challenge 2026**.
