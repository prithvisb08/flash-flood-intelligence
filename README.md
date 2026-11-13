# 🚨 JALRAKSHAK: Flash Flood Intelligence Platform

**Tagline:** A Real-Time, AI-Driven & Physics-Backed Flash Flood Early Warning System for Mountainous & Hilly Catchments.

This project was built for the **Smart India Hackathon (SIH)**. It serves as a Mission Control Dashboard that provides highly accurate, real-time flash flood predictions without relying on any paid APIs.

---

## 🧠 Core Architecture: Hybrid Two-Layered Prediction Model

This platform goes beyond standard ML models by implementing a robust hybrid architecture:

### **Layer 1: Physics-Based Flash Flood Risk Index (FFRI)**
- Calculates the true physical state of the terrain using real-time Open-Meteo weather data.
- **Parameters tracked:** 
  - 14-day cumulative rainfall (Antecedent Moisture)
  - Current precipitation intensity
  - Soil moisture content & temperature
  - Surface runoff & topography constraints
- **Output:** A strict physical threshold that determines if the ground is saturated enough to cause a flash flood.

### **Layer 2: AI / Machine Learning Validation**
- If the physics model (FFRI) detects a high risk, the ML model acts as the final gatekeeper.
- It analyzes historical weather patterns and sensor telemetry to confirm if the current conditions match previous flood events.
- **Benefit:** Drastically reduces false alarms (False Positives) by cross-verifying physical data with historical AI patterns.

---

## 🚀 Key Features

### 1. Zero Paid APIs
- The entire system operates entirely on free, open-source APIs (like Open-Meteo and OpenStreetMap). No Google Maps API keys or CARTO API keys are required.

### 2. Tactical "Mission Control" UI
- A high-end, dark-themed geographic digital twin.
- Utilizes customized OpenStreetMap tiles with CSS filtering to achieve a professional, military-grade tactical look without requiring premium map providers.
- Fully compliant with Survey of India (SOI) boundaries (accurately mapping the entire nation including PoK, Aksai Chin, and Arunachal Pradesh).

### 3. Automated NDMA Bulletin Generator
- Features an integrated Generative AI engine (powered by Gemini).
- Automatically converts complex numerical weather data and risk scores into official, human-readable SOS warning bulletins ready to be dispatched to local authorities and NDRF teams.

### 4. Sub-City Deep Dive & Simulation
- Capable of drilling down into specific high-risk zones.
- Provides real-time telemetry (simulated sensor data) to monitor granular changes in water levels and soil saturation.

### 5. 24x7 Citizen Helpline Integration
- Includes a fully functional conversational AI interface for citizens.
- Capable of answering queries regarding safe zones, evacuation routes, and current flood status in local languages.

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS, Leaflet (React-Leaflet)
- **Backend:** Python, FastAPI, Uvicorn
- **AI / ML:** Scikit-Learn (Random Forest), Pandas, Google GenAI (Gemini)
- **Data Sources:** Open-Meteo (Weather & Soil), GeoJSON (Boundaries)

---

## 💻 How to Run Locally (For SIH Judges)

To ensure maximum reliability during presentations (especially if internet connectivity is unstable), run this project locally:

**1. Start the Backend:**
```bash
cd backend
source venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**2. Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**3. View the Dashboard:**
Open your browser and navigate to `http://localhost:5173/admin` to view the Mission Control Dashboard.

---

*Built with passion for Smart India Hackathon to save lives in vulnerable mountainous terrains.*
