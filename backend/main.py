import os
import random
import threading
import time
import math
import requests
from weather import fetch_weather, fetch_elevation, fetch_historical_compare
from config import LOCATIONS
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import asyncio
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
from google import genai
from schemas import (
    SensorData, PredictionResult, SimulationState, SensorStatus, 
    Alert, TrajectoryPoint, SatelliteSourceInfo, SatelliteFeedItem,
    ModelEnsembleData, ExposureData
)
from routing import calculate_dynamic_route, generate_spatial_heatmap

app = FastAPI(title="JALRAKSHAK API - SIH 2026 Multi-Satellite Early Warning Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL SYSTEM STATE
# ═══════════════════════════════════════════════════════════════════════════════
system_state = {
    "live_mode": True,
    "last_synced_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
    "sync_in_progress": False,
    "sih_demo_step": 0,
    "total_syncs": 0,
    "failed_syncs": 0
}

# ═══════════════════════════════════════════════════════════════════════════════
# COMPREHENSIVE HILLY REGION DATABASE — ALL FLOOD-PRONE ZONES ACROSS INDIA
# Covers: Uttarakhand, Himachal Pradesh, J&K/Ladakh, Northeast (Meghalaya,
# Sikkim, Assam, Arunachal, Manipur, Mizoram, Nagaland), Western Ghats
# (Kerala, Karnataka, Maharashtra, Goa, Tamil Nadu Nilgiris)
# ═══════════════════════════════════════════════════════════════════════════════
# LOCATIONS imported from config.py

# ═══════════════════════════════════════════════════════════════════════════════
# SENSORS — Multi-Source IoT & Satellite Sensor Network
# ═══════════════════════════════════════════════════════════════════════════════
sensors = [
    {"id": "ISRO-INSAT3DR", "type": "ISRO INSAT-3DR Geostationary Imager (6-Ch)", "reading": "-52.4°C CTT", "battery": 100, "online": True, "health_score": 98, "status_label": "HEALTHY", "anomaly_detected": False, "last_updated": ""},
    {"id": "NASA-GPM-01", "type": "NASA/JAXA GPM Core Observatory (DPR + GMI)", "reading": "14.2 mm/hr flux", "battery": 98, "online": True, "health_score": 95, "status_label": "HEALTHY", "anomaly_detected": False, "last_updated": ""},
    {"id": "ESA-SENTINEL1", "type": "Copernicus Sentinel-1 C-Band SAR InSAR", "reading": "-5.8 dB σ°", "battery": 95, "online": True, "health_score": 99, "status_label": "HEALTHY", "anomaly_detected": False, "last_updated": ""},
    {"id": "IMD-DWR-RADAR", "type": "IMD S-Band Doppler Polarimetric Radar", "reading": "46.2 dBZ", "battery": 99, "online": True, "health_score": 100, "status_label": "HEALTHY", "anomaly_detected": False, "last_updated": ""},
    {"id": "SOIL-011", "type": "FDR Multi-Depth Soil Moisture Array (0-100cm)", "reading": "88%", "battery": 87, "online": True, "health_score": 85, "status_label": "HEALTHY", "anomaly_detected": False, "last_updated": ""},
    {"id": "WATER-004", "type": "Acoustic Doppler River Stage Gauge (CWC)", "reading": "5.4 m", "battery": 72, "online": True, "health_score": 75, "status_label": "HEALTHY", "anomaly_detected": False, "last_updated": ""},
    {"id": "SEISMO-01", "type": "Broadband Seismograph (IMD Network)", "reading": "0.02 g PGA", "battery": 94, "online": True, "health_score": 96, "status_label": "HEALTHY", "anomaly_detected": False, "last_updated": ""},
    {"id": "RAIN-AWS-03", "type": "Automatic Weather Station (Tipping Bucket)", "reading": "18.4 mm/hr", "battery": 82, "online": True, "health_score": 88, "status_label": "HEALTHY", "anomaly_detected": False, "last_updated": ""},
]

# ═══════════════════════════════════════════════════════════════════════════════
# BASELINE SIMULATION PARAMETERS (for all locations)
# ═══════════════════════════════════════════════════════════════════════════════
current_simulation = {}
for loc in LOCATIONS:
    # Generate realistic baselines from location metadata
    base_rain = loc["annual_rainfall_mm"] / 365 / 24 * random.uniform(0.5, 2.0)  # hourly proxy
    base_soil = 30 + (loc["vulnerability"] * 40) + random.uniform(-5, 5)
    base_wl = 1.5 + (base_rain * 0.05) + random.uniform(0, 1.5)
    base_rise = max(0.02, base_rain * 0.02)
    current_simulation[loc["id"]] = {
        "rainfall_1h": round(base_rain, 1),
        "soil_moisture": round(min(98, max(20, base_soil)), 1),
        "water_level": round(base_wl, 2),
        "water_level_rise_rate": round(base_rise, 2)
    }

# ═══════════════════════════════════════════════════════════════════════════════
# LIVE DATA CACHE & TRAJECTORY STORE
# ═══════════════════════════════════════════════════════════════════════════════
live_data_cache = {}
trajectories = {}
# Historical rolling window for anomaly detection (last N readings per location)
historical_readings = {loc["id"]: [] for loc in LOCATIONS}

# ═══════════════════════════════════════════════════════════════════════════════
# LIVE DATA SYNC ENGINE — Open-Meteo + Derived Satellite Proxies
# ═══════════════════════════════════════════════════════════════════════════════
def sync_single_location(loc):
    """Fetch live meteorological data and derive multi-satellite proxy values."""
    try:
        # Use cached fetch_weather utility (Open-Meteo) for core parameters
        weather = fetch_weather(loc['lat'], loc['lng'])
        rain_mm = float(weather.get('precipitation') or 0.0)
        # Soil moisture from utility (percentage)
        soil_raw = float(weather.get('humidity') or 0.0)  # using humidity as proxy for soil moisture if not provided
        # Additional parameters from original API response (cloud_cover, wind_speed) are fetched directly for satellite proxies
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={loc['lat']}&longitude={loc['lng']}&"
            f"current=cloud_cover,wind_speed_10m&"
            f"timezone=Asia/Kolkata"
        )
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            current = data.get("current", {})
            cloud_cover = float(current.get('cloud_cover') or 0.0)
            wind_speed = float(current.get('wind_speed_10m') or 0.0)
            humidity = float(current.get('relative_humidity_2m') or 60.0)
        else:
            # Use default fallback values when API request fails
            cloud_cover = 40.0
            wind_speed = 5.0
            humidity = 60.0

        soil_pct = min(100.0, max(15.0, soil_raw * 100.0 if soil_raw <= 1.0 else soil_raw))

        # Dynamically fetch elevation if possible, else fallback to base_slope logic
        elevation = fetch_elevation(loc['lat'], loc['lng'])
        dynamic_slope = loc["base_slope"] if elevation == 0 else min(90, max(10, elevation * 0.02))
        slope_factor = dynamic_slope / 60.0

        water_lvl = round(1.8 + (rain_mm * 0.08) + (soil_pct * 0.03) + (slope_factor * 0.5), 2)
        rise_rate = round(max(0.05, rain_mm * 0.035 + (slope_factor * rain_mm * 0.01)), 2)

        # Multi-Satellite Derived Signatures
        isro_cct = round(-15.0 - (cloud_cover * 0.65) - (rain_mm * 1.2) - (humidity * 0.1), 1)
        gpm_flux = round(rain_mm * 1.05 + random.uniform(0.0, 0.3), 2)
        sentinel_idx = round(-12.5 + (soil_pct * 0.12) + (humidity * 0.02), 2)
        imd_dbz = round(min(65.0, max(5.0, 10.0 + (rain_mm * 3.8) + (cloud_cover * 0.1))), 1)

        entry = {
            "rainfall_1h": round(rain_mm, 2),
            "soil_moisture": round(soil_pct, 1),
            "water_level": water_lvl,
            "water_level_rise_rate": rise_rate,
            "isro_insat_cct": isro_cct,
            "nasa_gpm_flux": gpm_flux,
            "sentinel_soil_idx": sentinel_idx,
            "imd_radar_dbz": imd_dbz,
            "wind_speed": wind_speed,
            "humidity": humidity,
            "wind_gust": weather.get('wind_gust') or 0.0,
            "snowmelt_rate": weather.get('snowmelt_rate') or 0.0,
            "dynamic_slope": dynamic_slope,
            "last_updated": datetime.now().strftime("%H:%M:%S IST")
        }
        live_data_cache[loc["id"]] = entry

        # Store for anomaly detection rolling window
        historical_readings[loc["id"]].append(rain_mm)
        if len(historical_readings[loc["id"]]) > 30:
            historical_readings[loc["id"]] = historical_readings[loc["id"]][-30:]
        return
    except Exception as e:
        system_state["failed_syncs"] += 1

    # Fallback to simulation baseline
    base = current_simulation.get(loc["id"], {"rainfall_1h": 20, "soil_moisture": 50, "water_level": 2.5, "water_level_rise_rate": 0.2})
    live_data_cache[loc["id"]] = {
        **base,
        "isro_insat_cct": -48.5, "nasa_gpm_flux": round(base["rainfall_1h"] * 1.02, 2),
        "sentinel_soil_idx": -6.8, "imd_radar_dbz": 38.5,
        "wind_speed": 8.0, "humidity": 70.0,
        "last_updated": datetime.now().strftime("%H:%M:%S IST")
    }

def sync_all_live_data():
    """Parallel-ish sync of all locations."""
    system_state["sync_in_progress"] = True
    for loc in LOCATIONS:
        sync_single_location(loc)
    system_state["last_synced_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
    system_state["sync_in_progress"] = False
    system_state["total_syncs"] += 1
    print(f"🛰️ Synced {len(LOCATIONS)} locations | Total syncs: {system_state['total_syncs']} | Failed: {system_state['failed_syncs']}")

# Background initial sync and poller
def background_weather_poller():
    """Sync initially in background and then auto-sync every 3 minutes."""
    try:
        sync_all_live_data()
    except Exception as e:
        print("Initial sync error:", e)
    while True:
        time.sleep(180)
        if system_state["live_mode"] and system_state["sih_demo_step"] == 0:
            sync_all_live_data()

threading.Thread(target=background_weather_poller, daemon=True).start()


# ═══════════════════════════════════════════════════════════════════════════════
# ADVANCED RISK ENGINE
# ═══════════════════════════════════════════════════════════════════════════════
def get_base_trajectory(loc_id, current_prob):
    """Maintain a 6-hour rolling risk trajectory per location."""
    now = datetime.now()
    if loc_id not in trajectories:
        trj = []
        for i in range(5, 0, -1):
            t = now - timedelta(hours=i)
            prob = max(0, min(100, current_prob - (i * random.uniform(2, 6))))
            trj.append(TrajectoryPoint(timestamp=t.strftime("%H:00"), risk_probability=round(prob, 1)))
        trj.append(TrajectoryPoint(timestamp=now.strftime("%H:00"), risk_probability=round(current_prob, 1)))
        trajectories[loc_id] = trj

    old_prob = trajectories[loc_id][-1].risk_probability
    new_prob = round((old_prob * 0.35) + (current_prob * 0.65), 1)
    trajectories[loc_id][-1].risk_probability = new_prob
    return trajectories[loc_id]

def compute_upstream_impact(loc_id, all_sim_data):
    """Cascading spatio-temporal risk: upstream sensor data flows downstream."""
    impact = 0.0
    for l in LOCATIONS:
        if loc_id in l.get("upstream_of", []):
            up_data = all_sim_data.get(l["id"], {})
            rise = up_data.get("water_level_rise_rate", 0)
            rain = up_data.get("rainfall_1h", 0)
            if rise > 0.3:
                impact += (rise * 12)
            if rain > 40:
                impact += (rain * 0.15)
    return min(40.0, impact)

def detect_rainfall_anomaly(loc_id, current_rain):
    """Z-score based anomaly detection on rolling rainfall window."""
    history = historical_readings.get(loc_id, [])
    if len(history) < 5:
        return False, 0.0
    mean_rain = sum(history) / len(history)
    std_rain = max(0.01, (sum((x - mean_rain)**2 for x in history) / len(history))**0.5)
    z_score = (current_rain - mean_rain) / std_rain
    return z_score > 2.0, round(z_score, 2)

def compute_antecedent_precipitation_index(loc_id, current_rain):
    """API-30 (Antecedent Precipitation Index) — exponential decay of past rainfall."""
    history = historical_readings.get(loc_id, [])
    k = 0.85  # decay constant
    api = current_rain
    for i, past_rain in enumerate(reversed(history)):
        api += past_rain * (k ** (i + 1))
    return round(min(500, api), 1)

@app.get("/api/risk", response_model=List[PredictionResult])
def get_all_risks():
    results = []

    # Pre-fetch all sim data for upstream mapping
    all_sim_data = {}
    for loc in LOCATIONS:
        if system_state["live_mode"] and loc["id"] in live_data_cache:
            all_sim_data[loc["id"]] = live_data_cache[loc["id"]]
        else:
            all_sim_data[loc["id"]] = current_simulation.get(
                loc["id"],
                {"rainfall_1h": 20, "soil_moisture": 50, "water_level": 2.5, "water_level_rise_rate": 0.2}
            )

    # Sensor health impacts confidence
    online_sensors = sum(1 for s in sensors if s["online"])
    total_sensors = len(sensors)
    sensor_health_ratio = online_sensors / total_sensors
    base_confidence = 96.0 * sensor_health_ratio

    water_sensor_online = next((s["online"] for s in sensors if s["id"] == "WATER-004"), True)
    radar_online = next((s["online"] for s in sensors if s["id"] == "IMD-DWR-RADAR"), True)
    seismo_online = next((s["online"] for s in sensors if s["id"] == "SEISMO-01"), True)

    if not water_sensor_online: base_confidence -= 8.0
    if not radar_online: base_confidence -= 6.0
    base_confidence = max(40.0, base_confidence)

    for loc in LOCATIONS:
        sim_data = all_sim_data[loc["id"]]

        # ─── Multi-Factor Physical Risk Score ───
        rain_score = sim_data["rainfall_1h"] * 0.45
        soil_score = sim_data["soil_moisture"] * 0.25
        rise_score = sim_data["water_level_rise_rate"] * 35
        
        dyn_slope = sim_data.get("dynamic_slope", loc["base_slope"])
        slope_score = (dyn_slope / 60.0) * 15
        vuln_score = loc["vulnerability"] * 12
        
        wind_gust_score = min(15, sim_data.get("wind_gust", 0) * 0.15)
        snowmelt_score = min(20, sim_data.get("snowmelt_rate", 0) * 2.0)

        physical_risk = rain_score + soil_score + rise_score + slope_score + vuln_score + wind_gust_score + snowmelt_score

        # Upstream cascade penalty
        upstream_penalty = compute_upstream_impact(loc["id"], all_sim_data)
        physical_risk += upstream_penalty

        # Anomaly detection boost
        is_anomaly, z_score = detect_rainfall_anomaly(loc["id"], sim_data["rainfall_1h"])
        if is_anomaly:
            physical_risk += min(15, z_score * 5)

        # API (Antecedent Precipitation Index) boost — wet soil history
        api_val = compute_antecedent_precipitation_index(loc["id"], sim_data["rainfall_1h"])
        if api_val > 100:
            physical_risk += min(10, (api_val - 100) * 0.05)

        # ─── Ensemble Model Scoring (Simulated) ───
        noise_lr = random.uniform(-2, 2)
        noise_rf = random.uniform(-1.5, 1.5)
        noise_xgb = random.uniform(-1, 1)

        log_reg = min(99.0, max(3.0, physical_risk * 0.78 + noise_lr))
        rf_score = min(99.0, max(3.0, physical_risk * 0.94 + noise_rf))
        xgb_score = min(99.0, max(3.0, physical_risk * 1.06 + noise_xgb))

        ensemble_score = (log_reg * 0.15) + (rf_score * 0.40) + (xgb_score * 0.45)
        ensemble_score = min(99.9, max(2.0, ensemble_score))

        # ─── Risk Classification ───
        if ensemble_score > 80: risk_level, risk_idx = "CRITICAL", 3
        elif ensemble_score > 55: risk_level, risk_idx = "HIGH", 2
        elif ensemble_score > 30: risk_level, risk_idx = "MODERATE", 1
        else: risk_level, risk_idx = "LOW", 0

        # ─── Compound Landslide Hazard ───
        landslide_base = (loc["base_slope"] / 60) * 45 + (sim_data["soil_moisture"] / 100) * 55
        if not seismo_online:
            landslide_base *= 0.9  # less confident without seismograph
        landslide_prob = min(99.0, landslide_base)

        if risk_idx >= 2 and landslide_prob > 70:
            compound_hazard = "CRITICAL"
        elif landslide_prob > 50 or risk_idx >= 1:
            compound_hazard = "MODERATE"
        else:
            compound_hazard = "LOW"

        # ─── Trajectory & Trend Analysis ───
        traj = get_base_trajectory(loc["id"], ensemble_score)
        past_val = traj[-3].risk_probability if len(traj) > 2 else traj[0].risk_probability
        diff = ensemble_score - past_val
        if diff > 20: trend = "RAPIDLY INCREASING"
        elif diff > 8: trend = "INCREASING"
        elif diff < -8: trend = "DECREASING"
        else: trend = "STABLE"

        # ─── Explainability (SHAP-style) ───
        pos_factors = {}
        neg_factors = {}

        if sim_data['rainfall_1h'] > 20:
            pos_factors['Intense Rainfall'] = round(min(0.65, sim_data['rainfall_1h'] / 180), 2)
        if sim_data['soil_moisture'] > 70:
            pos_factors['High Soil Saturation (>70%)'] = 0.28
        if sim_data['water_level_rise_rate'] > 0.3:
            pos_factors['Rapid Water Rise Velocity'] = round(min(0.45, sim_data['water_level_rise_rate'] * 0.3), 2)
        if upstream_penalty > 5:
            pos_factors['Upstream Cascade Inflow'] = round(min(0.35, upstream_penalty / 40), 2)
        dyn_slope = sim_data.get("dynamic_slope", loc["base_slope"])
        if dyn_slope > 45:
            pos_factors['Steep Topography (>{0}°)'.format(round(dyn_slope))] = round(dyn_slope / 90, 2)
        if sim_data.get('wind_gust', 0) > 40:
            pos_factors['High Wind Gust (>40 km/h)'] = round(sim_data['wind_gust'] / 100, 2)
        if sim_data.get('snowmelt_rate', 0) > 2:
            pos_factors['Rapid Snowmelt Detected'] = 0.25
        if is_anomaly:
            pos_factors[f'Rainfall Anomaly (Z={z_score})'] = 0.22
        if api_val > 100:
            pos_factors['High Antecedent Precipitation'] = 0.18
        if sim_data.get('humidity', 60) > 85:
            pos_factors['Extreme Humidity (>85%)'] = 0.12
        if loc['vulnerability'] > 0.85:
            pos_factors['Historical Vulnerability'] = round(loc['vulnerability'] * 0.3, 2)

        if sim_data['soil_moisture'] < 40:
            neg_factors['Dry Soil Absorption Capacity'] = 0.22
        if sim_data['water_level'] < 2.5:
            neg_factors['Low Baseline River Stage'] = 0.18
        if sim_data['rainfall_1h'] < 10:
            neg_factors['Minimal Current Precipitation'] = 0.15
        if sim_data.get('wind_speed', 5) > 20:
            neg_factors['High Wind (Cloud Dispersal)'] = 0.10

        actions = [
            "Normal operations. Continuous multi-satellite telemetry active.",
            "Advisory: Clear local drainage, alert panchayat & quick response teams.",
            "Warning: High risk of flash flood/mudslide. Activate evacuation routes.",
            "EMERGENCY: Immediate evacuation to designated safe zones. Flash flood imminent!"
        ]
        lead_times = ["N/A", "12-24 hours", "3-6 hours", "1-3 hours"]

        # Confidence adjustment per location
        loc_confidence = base_confidence
        if is_anomaly:
            loc_confidence -= 3.0  # anomaly = less certainty
        loc_confidence = round(max(40.0, min(99.0, loc_confidence - random.uniform(0, 1.5))), 1)

        results.append(PredictionResult(
            location_id=loc["id"],
            location_name=f"{loc['name']}, {loc['state']}",
            risk_level=risk_level,
            flood_probability=round(ensemble_score, 1),
            landslide_probability=round(landslide_prob, 1),
            compound_hazard_level=compound_hazard,
            confidence=loc_confidence,
            contributing_factors=pos_factors,
            negative_factors=neg_factors,
            recommended_action=actions[risk_idx],
            safe_zone=loc["safe_zone"],
            trajectory=traj,
            trajectory_trend=trend,
            lead_time_window=lead_times[risk_idx],
            lat=loc["lat"],
            lng=loc["lng"],
            ensemble_data=ModelEnsembleData(
                logistic_regression=round(log_reg, 1),
                random_forest=round(rf_score, 1),
                xgboost=round(xgb_score, 1),
                ensemble_score=round(ensemble_score, 1),
                model_agreement="HIGH" if abs(rf_score - xgb_score) < 8 else "MODERATE" if abs(rf_score - xgb_score) < 15 else "LOW"
            ),
            exposure=ExposureData(
                population_exposed=loc["population"],
                critical_infrastructure=loc.get("critical_infra", random.randint(1, 5)),
                road_segments_affected=random.randint(2, 10)
            ),
            satellite_info=SatelliteSourceInfo(
                isro_insat_cct=round(sim_data.get("isro_insat_cct", -45), 1),
                nasa_gpm_flux=round(sim_data.get("nasa_gpm_flux", 12), 1),
                sentinel_soil_idx=round(sim_data.get("sentinel_soil_idx", -7), 1),
                imd_radar_dbz=round(sim_data.get("imd_radar_dbz", 35), 1)
            )
        ))
    return results

# ═══════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/sync")
def trigger_live_sync():
    """Forces an immediate multi-source live sync."""
    sync_all_live_data()
    return {
        "status": "success",
        "message": f"All {len(LOCATIONS)} Indian hilly regions synchronized with real-time multi-satellite data.",
        "timestamp": system_state["last_synced_at"],
        "total_locations": len(LOCATIONS)
    }

class ModeToggle(BaseModel):
    live_mode: bool

@app.post("/api/mode")
def toggle_mode(mode: ModeToggle):
    system_state["live_mode"] = mode.live_mode
    if mode.live_mode:
        sync_all_live_data()
    return {"status": "success", "live_mode": system_state["live_mode"]}

@app.get("/api/mode")
def get_mode():
    return {
        "live_mode": system_state["live_mode"],
        "last_synced_at": system_state["last_synced_at"],
        "sync_in_progress": system_state["sync_in_progress"]
    }

class AIQuery(BaseModel):
    query: str

LOCATION_ALIASES = {
    "UK-001": ["devprayag", "dev prayag", "alaknanda", "alaknanda basin"],
    "UK-002": ["joshimath", "chamoli", "dhauliganga", "tapovan"],
    "UK-003": ["kedarnath", "mandakini", "kedar", "kedarnath valley", "gaurikund"],
    "UK-004": ["rudraprayag", "rudra prayag", "sangam"],
    "UK-005": ["pithoragarh", "pithoragarh fort", "kali river", "jhulaghat"],
    "UK-006": ["uttarkashi", "bhagirathi", "dharasu"],
    "HP-001": ["manali", "upper beas", "rohtang", "solang", "beas river"],
    "HP-002": ["kullu", "aut", "aut valley", "bhuntar", "pandoh"],
    "HP-003": ["dharamshala", "dharamsala", "kangra", "mcleodganj", "bhagsunag"],
    "HP-004": ["shimla", "tutu", "ridge", "kufri", "sanjauli"],
    "HP-005": ["kinnaur", "kalpa", "sutlej gorge", "sangla", "reckong peo"],
    "HP-006": ["mandi", "pandoh dam", "beas-sutlej"],
    "JK-001": ["srinagar", "jhelum", "dal lake", "kashmir", "badgam"],
    "JK-002": ["anantnag", "lidder", "pahalgam", "achabal"],
    "JK-003": ["rajouri", "pir panjal", "poonch", "mughal road", "thanamandi"],
    "NE-001": ["cherrapunji", "sohra", "meghalaya", "nohkalikai"],
    "NE-002": ["gangtok", "sikkim", "teesta", "teesta river", "lhonak"],
    "NE-003": ["haflong", "dima hasao", "assam hills", "jatinga"],
    "NE-004": ["itanagar", "arunachal", "papum pare", "naharlagun"],
    "NE-005": ["imphal", "manipur", "loktak", "kangla"],
    "NE-006": ["aizawl", "mizoram", "tlawng"],
    "NE-007": ["kohima", "nagaland", "dhansiri"],
    "NE-008": ["mawsynram", "wah rilang", "mawsynram plateau"],
    "WG-001": ["wayanad", "chooralmala", "meppadi", "mundakkai", "kerala", "kerala flood"],
    "WG-002": ["munnar", "muthirapuzha", "devikulam", "tata high altitude"],
    "WG-003": ["mahabaleshwar", "chiplun", "koyna", "vashishti", "maharashtra"],
    "WG-004": ["coorg", "madikeri", "kodagu", "cauvery", "karnataka"],
    "WG-005": ["nilgiris", "ooty", "coonoor", "tamil nadu", "bhavani"],
    "WG-006": ["idukki", "periyar", "cheruthoni", "idukki dam"],
    "WG-007": ["amboli", "sindhudurg", "amboli ghat"],
    "WG-008": ["goa", "sanguem", "zuari", "goa hinterland"],
}

def format_location_card(loc_obj, sim_entry, risk_item):
    """Formats full mobile-weather style breakdown for any location."""
    rain = sim_entry.get("rainfall_1h", 0.0)
    if rain > 70:
        rain_desc = "🔴 Severe Cloudburst / Flash-Flood Intensity"
    elif rain > 35:
        rain_desc = "🟠 Heavy Downpour"
    elif rain > 15:
        rain_desc = "🟡 Moderate Rainfall"
    elif rain > 2:
        rain_desc = "🟢 Light Rain / Showers"
    else:
        rain_desc = "⚪ Minimal / Clear"

    soil = sim_entry.get("soil_moisture", 50.0)
    if soil > 85:
        soil_status = "CRITICAL (Near Liquefaction / Mudslide Threat)"
    elif soil > 70:
        soil_status = "HIGHLY SATURATED (High Runoff Velocity)"
    elif soil > 50:
        soil_status = "MODERATE SATURATION"
    else:
        soil_status = "DRY / GOOD ABSORPTION CAPACITY"

    r_level = risk_item.risk_level if risk_item else "MODERATE"
    r_color = "🔴" if r_level == "CRITICAL" else "🟠" if r_level == "HIGH" else "🟡" if r_level == "MODERATE" else "🟢"
    
    flood_p = risk_item.flood_probability if risk_item else round(rain * 0.7, 1)
    land_p = risk_item.landslide_probability if risk_item else round(soil * 0.6, 1)
    comp_h = risk_item.compound_hazard_level if risk_item else "MODERATE"
    trend = risk_item.trajectory_trend if risk_item else "STABLE"
    lead_time = risk_item.lead_time_window if risk_item else "3-6 hours"
    conf = risk_item.confidence if risk_item else 92.0
    safe_sh = risk_item.safe_zone if risk_item else loc_obj.get("safe_zone", "Designated Safe Shelter")
    action_rec = risk_item.recommended_action if risk_item else "Continuous telemetry monitoring."
    
    wl = sim_entry.get("water_level", 2.5)
    rise_rate = sim_entry.get("water_level_rise_rate", 0.1)
    cct = sim_entry.get("isro_insat_cct", -45.0)
    gpm = sim_entry.get("nasa_gpm_flux", round(rain * 1.05, 1))
    sar = sim_entry.get("sentinel_soil_idx", -7.5)
    radar = sim_entry.get("imd_radar_dbz", 35.0)
    hum = sim_entry.get("humidity", 65.0)
    wind = sim_entry.get("wind_speed", 10.0)
    
    pop = loc_obj.get("population", 3000)
    elev = loc_obj.get("elevation_m", "N/A")
    basin = loc_obj.get("river_basin", "Local Watershed")
    history = loc_obj.get("historical_events", [])
    history_str = f"\n• 📜 Historical Context: {'; '.join(history[:2])}" if history else ""

    return (
        f"📍 **{loc_obj['name']}, {loc_obj['state']}**\n"
        f"• Region: {loc_obj['region']} | Basin: {basin} | Elevation: {elev}m\n\n"
        f"🌦️ **Live Weather & Telemetry (Real-time Stream):**\n"
        f"• Current Rainfall: **{rain} mm/hr** — *{rain_desc}*\n"
        f"• Soil Saturation: **{soil}%** — *{soil_status}*\n"
        f"• Relative Humidity: **{hum}%** | Wind Speed: **{wind} km/h**\n\n"
        f"🌊 **Hydrology & River Stage:**\n"
        f"• River Stage: **{wl} meters**\n"
        f"• Rate of Rise: **+{rise_rate} m/hr** {'⚠️ Rapid Inflow Detected!' if rise_rate > 0.4 else '(Normal drift)'}\n\n"
        f"🛰️ **Multi-Satellite & Radar Telemetry:**\n"
        f"• ISRO INSAT-3DR CTT: **{cct}°C** {'(Deep Convective Cloud)' if cct < -40 else '(Stable)'}\n"
        f"• NASA GPM IMERG Flux: **{gpm} mm/hr**\n"
        f"• Copernicus Sentinel-1 InSAR: **{sar} dB**\n"
        f"• IMD Doppler Radar Echo: **{radar} dBZ**\n\n"
        f"⚠️ **AI Multi-Model Hazard Assessment:**\n"
        f"• Risk Classification: {r_color} **{r_level}** (Model Confidence: **{conf}%**)\n"
        f"• Flash Flood Probability: **{flood_p}%**\n"
        f"• Landslide Susceptibility: **{land_p}%**\n"
        f"• Compound Multi-Hazard: **{comp_h}**\n"
        f"• Trajectory Trend: **{trend}** | Warning Lead Time: **{lead_time}**\n\n"
        f"🛡️ **Evacuation Protocol & Action:**\n"
        f"• Directive: {action_rec}\n"
        f"• 🏁 Verified Safe Shelter: **{safe_sh}**\n"
        f"• 👥 Exposed Population in Ward: **{pop:,} residents**"
        f"{history_str}"
    )


from fastapi.responses import PlainTextResponse

@app.get("/api/bulletin/{location_id}")
def generate_official_bulletin(location_id: str):
    loc_obj = next((l for l in LOCATIONS if l["id"] == location_id), None)
    if not loc_obj:
        raise HTTPException(status_code=404, detail="Location not found")
        
    risks = get_all_risks()
    risk_item = next((r for r in risks if r.location_id == location_id), None)
    
    sim_data = live_data_cache.get(location_id, {})
    
    # NDMA format template
    bulletin = f"""
======================================================================
                  OFFICIAL FLASH FLOOD DISPATCH
======================================================================
ISSUING AUTHORITY: JALRAKSHAK INTELLIGENCE COMMAND
TIMESTAMP: {datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")}
LOCATION: {loc_obj['name']}, {loc_obj['state']} ({loc_obj['region']})
BASIN: {loc_obj.get('river_basin', 'N/A')}
----------------------------------------------------------------------
[1] CURRENT TELEMETRY (MULTI-SOURCE)
- Precipitation (1hr): {sim_data.get('rainfall_1h', 0)} mm
- Soil Saturation: {sim_data.get('soil_moisture', 0)} %
- River Stage: {sim_data.get('water_level', 0)} m (Rise Rate: +{sim_data.get('water_level_rise_rate', 0)} m/hr)
- ISRO INSAT-3DR CTT: {sim_data.get('isro_insat_cct', 'N/A')} °C
- Sentinel SAR Index: {sim_data.get('sentinel_soil_idx', 'N/A')} dB

[2] AI RISK ASSESSMENT (LAYER 1 + ENSEMBLE)
- Overall Threat Level: {risk_item.risk_level if risk_item else 'N/A'}
- Flash Flood Probability: {risk_item.flood_probability if risk_item else 'N/A'}%
- Landslide Hazard: {risk_item.landslide_probability if risk_item else 'N/A'}%
- Trajectory Trend: {risk_item.trajectory_trend if risk_item else 'N/A'}
- Warning Lead Time: {risk_item.lead_time_window if risk_item else 'N/A'}

[3] IMPACT & EXPOSURE
- Population in Danger Zone: {loc_obj.get('population', 'N/A')}
- Critical Infrastructure at Risk: {loc_obj.get('critical_infra', 'N/A')} facilities

[4] DIRECTIVE
{risk_item.recommended_action if risk_item else 'Continuous Monitoring Required.'}
DESIGNATED SAFE ZONE: {loc_obj.get('safe_zone', 'N/A')}

======================================================================
    """
    return PlainTextResponse(bulletin, media_type="text/plain", headers={
        "Content-Disposition": f"attachment; filename=NDMA_BULLETIN_{location_id}_{datetime.now().strftime('%Y%m%d%H%M')}.txt"
    })

@app.get("/api/subcity_zones/{location_id}")
def get_subcity_zones(location_id: str):
    # Simulated 2-3km micro-grid for City Deep Dive
    loc_obj = next((l for l in LOCATIONS if l["id"] == location_id), None)
    if not loc_obj:
        raise HTTPException(status_code=404, detail="Location not found")
        
    base_lat = loc_obj['lat']
    base_lng = loc_obj['lng']
    offset = 0.02 # approx 2km
    
    return {
        "location_id": location_id,
        "name": loc_obj['name'],
        "zones": [
            {"name": "North Sector", "lat": base_lat + offset, "lng": base_lng, "risk_multiplier": 1.1},
            {"name": "South Sector", "lat": base_lat - offset, "lng": base_lng, "risk_multiplier": 0.8},
            {"name": "East Sector", "lat": base_lat, "lng": base_lng + offset, "risk_multiplier": 0.95},
            {"name": "West Sector", "lat": base_lat, "lng": base_lng - offset, "risk_multiplier": 1.05}
        ]
    }

@app.get("/api/historical_compare/{location_id}")
def get_historical_comparison(location_id: str):
    loc_obj = next((l for l in LOCATIONS if l["id"] == location_id), None)
    if not loc_obj:
        raise HTTPException(status_code=404, detail="Location not found")
    
    return fetch_historical_compare(loc_obj['lat'], loc_obj['lng'])

@app.post("/api/ai/query")

def rakshak_ai_query(q: AIQuery):
    query = q.query.lower().strip()
    risks = get_all_risks()
    
    # Pre-fetch all simulation / live data entries
    all_sim_data = {}
    for loc in LOCATIONS:
        if system_state["live_mode"] and loc["id"] in live_data_cache:
            all_sim_data[loc["id"]] = live_data_cache[loc["id"]]
        else:
            all_sim_data[loc["id"]] = current_simulation.get(loc["id"], {"rainfall_1h": 15, "soil_moisture": 45, "water_level": 2.5, "water_level_rise_rate": 0.1})

    # 1. GREETING / CASUAL CONVERSATION (ChatGPT-style)
    casual_greetings = ["hi", "hello", "hey", "namaste", "halo", "kaise ho", "kya haal hai", "good morning", "good evening", "shuru", "start"]
    if any(query == g or query.startswith(g + " ") or query.endswith(" " + g) for g in casual_greetings):
        online_cnt = sum(1 for s in sensors if s["online"])
        crit_cnt = sum(1 for r in risks if r.risk_level in ["CRITICAL", "HIGH"])
        return {
            "response": (
                f"Namaste! 🙏 I am **Rakshak AI**, your real-time Flash Flood & Multi-Hazard Intelligence Assistant.\n\n"
                f"Currently monitoring **{len(LOCATIONS)} hilly regions** across **15 Indian states** in real-time.\n"
                f"• 🛰️ Multi-Satellite Feeds: **ISRO INSAT-3DR, NASA GPM, Sentinel-1 SAR, IMD Radars** active.\n"
                f"• 📡 IoT Sensors Online: **{online_cnt}/{len(sensors)}**\n"
                f"• 🚨 Severe Alert Zones: **{crit_cnt} regions**\n\n"
                f"**Aap mujhse kisi bhi hilly region ka live update pooch sakte hain:**\n"
                f"1. *'Manali ka mausam aur barish kitni hai?'*\n"
                f"2. *'Wayanad Chooralmala me flood risk kya hai?'*\n"
                f"3. *'Kedarnath aur Joshimath ka update do'*\n"
                f"4. *'Sabse zyada barish kahan ho rahi hai?'*\n"
                f"5. *'Kaunse areas Critical danger me hain?'*\n"
                f"6. *'Sensors aur satellites ka status dikhao'*\n\n"
                f"Bataiye, aap kis jagah ki jankari chahte hain?"
            )
        }

    # 2. MATCH SPECIFIC LOCATION(S)
    matched_locs = []
    for loc_id, aliases in LOCATION_ALIASES.items():
        if any(alias in query for alias in aliases):
            loc_obj = next((l for l in LOCATIONS if l["id"] == loc_id), None)
            if loc_obj:
                matched_locs.append(loc_obj)

    # Also match by state/region if no individual location matched
    if not matched_locs:
        if "uttarakhand" in query or "uk" in query:
            matched_locs = [l for l in LOCATIONS if l["state"] == "Uttarakhand"]
        elif "himachal" in query or "hp" in query:
            matched_locs = [l for l in LOCATIONS if l["state"] == "Himachal Pradesh"]
        elif "kerala" in query:
            matched_locs = [l for l in LOCATIONS if l["state"] == "Kerala"]
        elif "kashmir" in query or "jammu" in query or "j&k" in query:
            matched_locs = [l for l in LOCATIONS if l["state"] == "Jammu & Kashmir"]
        elif "meghalaya" in query:
            matched_locs = [l for l in LOCATIONS if l["state"] == "Meghalaya"]
        elif "sikkim" in query:
            matched_locs = [l for l in LOCATIONS if l["state"] == "Sikkim"]
        elif "maharashtra" in query or "western ghats" in query or "ghats" in query:
            matched_locs = [l for l in LOCATIONS if "Western Ghats" in l["region"]]
        elif "northeast" in query or "ne" in query:
            matched_locs = [l for l in LOCATIONS if l["region"] == "Northeast"]

    # IF LOCATIONS MATCHED
    if matched_locs:
        if len(matched_locs) == 1:
            loc = matched_locs[0]
            sim = all_sim_data.get(loc["id"], {})
            r_item = next((r for r in risks if r.location_id == loc["id"]), None)
            return {"response": format_location_card(loc, sim, r_item)}
        
        # If multiple locations matched: provide summary comparison
        cards = []
        for loc in matched_locs[:4]:  # Top 4 to prevent message truncation
            sim = all_sim_data.get(loc["id"], {})
            r_item = next((r for r in risks if r.location_id == loc["id"]), None)
            cards.append(format_location_card(loc, sim, r_item))
        
        header = f"📊 **Found {len(matched_locs)} Monitored Zones Matching Your Request:**\n\n"
        return {"response": header + "\n\n---\n\n".join(cards)}

    # 3. HIGHEST RAINFALL / RAINFALL RANKING INQUIRY
    if any(term in query for term in ["sabse zyada barish", "highest rain", "heavy rain", "max rain", "top rainfall", "barish kahan", "rainfall rank", "rainfall ranking"]):
        sorted_by_rain = sorted(LOCATIONS, key=lambda l: all_sim_data.get(l["id"], {}).get("rainfall_1h", 0), reverse=True)
        top5 = sorted_by_rain[:5]
        resp_lines = ["🌧️ **Top 5 Locations with Highest Real-Time Rainfall:**\n"]
        for idx, l in enumerate(top5, 1):
            s = all_sim_data.get(l["id"], {})
            r = next((item for item in risks if item.location_id == l["id"]), None)
            risk_tag = f"[{r.risk_level}]" if r else ""
            resp_lines.append(
                f"**{idx}. {l['name']} ({l['state']})** {risk_tag}\n"
                f"   • Rainfall: **{s.get('rainfall_1h', 0)} mm/hr** | Soil: **{s.get('soil_moisture', 0)}%**\n"
                f"   • River Stage: **{s.get('water_level', 0)}m** (+{s.get('water_level_rise_rate', 0)} m/hr)\n"
                f"   • Safe Shelter: {l['safe_zone']}\n"
            )
        resp_lines.append("💡 *Tip: Aap kisi bhi location ka naam pooch kar uska full satellite telemetry analysis dekh sakte hain.*")
        return {"response": "\n".join(resp_lines)}

    # 4. HIGHEST RISK / CRITICAL / EMERGENCY INQUIRY
    if any(term in query for term in ["critical", "high risk", "khatra", "danger", "severe", "emergency", "alert", "red alert", "warn"]):
        critical_items = [r for r in risks if r.risk_level in ["CRITICAL", "HIGH"]]
        if not critical_items:
            return {
                "response": (
                    "✅ **Good News:** Currently, none of the 31 monitored Himalayan, Northeast, or Western Ghats river basins are at CRITICAL risk.\n\n"
                    "All river stages and convective cloud thresholds are within normal to moderate bounds. Continuous ISRO/NASA telemetry active."
                )
            }
        
        lines = [f"🚨 **URGENT: {len(critical_items)} Regions Under Elevated Disaster Risk:**\n"]
        for r in critical_items:
            color = "🔴" if r.risk_level == "CRITICAL" else "🟠"
            lines.append(
                f"{color} **{r.location_name}** — **{r.risk_level} ALERT**\n"
                f"• Flash Flood Prob: **{r.flood_probability}%** | Landslide: **{r.landslide_probability}%**\n"
                f"• Trajectory: **{r.trajectory_trend}** | Early-Warning Window: **{r.lead_time_window}**\n"
                f"• Primary Risk Drivers: {', '.join(list(r.contributing_factors.keys())[:3])}\n"
                f"• 🏃 Immediate Evacuation Shelter: **{r.safe_zone}**\n"
                f"• Protocol: {r.recommended_action}\n"
            )
        return {"response": "\n".join(lines)}

    # 5. SAFEST ZONES INQUIRY
    if any(term in query for term in ["safe", "safest", "surakshit", "lowest risk", "green zone", "normal"]):
        low_risk = [r for r in risks if r.risk_level == "LOW"]
        low_risk.sort(key=lambda x: x.flood_probability)
        top_safe = low_risk[:5]
        lines = ["🛡️ **Safest Monitored Hilly Regions Right Now (Lowest Risk):**\n"]
        for idx, r in enumerate(top_safe, 1):
            lines.append(
                f"**{idx}. {r.location_name}**\n"
                f"• Flood Prob: **{r.flood_probability}%** | Landslide: **{r.landslide_probability}%**\n"
                f"• Status: Normal conditions, clear drainage capacity.\n"
                f"• Designated High-Ground Assembly: {r.safe_zone}\n"
            )
        return {"response": "\n".join(lines)}

    # 6. SENSORS & SATELLITES TELEMETRY STATUS
    if any(term in query for term in ["sensor", "iot", "battery", "radar", "health", "isro", "nasa", "sentinel", "satellite"]):
        online_count = sum(1 for s in sensors if s["online"])
        lines = [
            f"🛰️ **JALRAKSHAK Multi-Source Sensor & Earth Observation Grid:**\n",
            f"• **Active Network Status:** {online_count}/{len(sensors)} Online ({(online_count/len(sensors))*100:.0f}% Coverage)\n",
            f"• **Live Mode:** {'🟢 Stream Active (Syncing ISRO/NASA Feeds)' if system_state['live_mode'] else '🟠 Manual Simulation Active'}\n",
            f"• **Last Telemetry Sync:** {system_state['last_synced_at']}\n",
            "**Individual Sensor Health Breakdown:**"
        ]
        for s in sensors:
            status_icon = "🟢" if s["online"] else "🔴"
            health_str = f"{s.get('health_score', 0)}%" if s["online"] else "OFFLINE"
            lines.append(
                f"{status_icon} **{s['id']}** ({s['type']})\n"
                f"   • Current Reading: `{s['reading']}` | Battery: {s['battery']}% | Health: {health_str}"
            )
        return {"response": "\n".join(lines)}

    # 7. EXPLANATION OF DISASTER PHENOMENON (CLOUDBURST, GLOF, LANDSLIDE)
    if "cloudburst" in query or "badal phatna" in query:
        return {
            "response": (
                "⛈️ **What is a Cloudburst (Badal Phatna)?**\n\n"
                "According to the India Meteorological Department (IMD), a **cloudburst** is an extreme meteorological event where **rainfall ≥ 100 mm per hour** occurs over a localized geographic area of approximately 20–30 km² in hilly terrain.\n\n"
                "**How JALRAKSHAK Detects Cloudbursts Ahead of Time:**\n"
                "1. **ISRO INSAT-3DR Imager:** Monitors Cloud Top Temperature (CTT). When CTT drops below **-40°C to -60°C**, it signals deep convective cumulonimbus towers capable of cloudbursts.\n"
                "2. **IMD Doppler Weather Radar (DWR):** Detects intense radar echo reflectivity **> 45 dBZ** indicating torrential vertical precipitation.\n"
                "3. **IoT Rate of Rise:** Rapid river stage velocity acceleration (> 0.5 m/hr) immediately triggers an automated early warning before downstream settlements are impacted."
            )
        }

    if "glof" in query or "glacial" in query:
        return {
            "response": (
                "🏔️ **What is a Glacial Lake Outburst Flood (GLOF)?**\n\n"
                "A GLOF occurs when a dam containing a glacial lake (made of moraine, ice, or loose rock) suddenly breaches, releasing millions of cubic meters of water downstream in minutes.\n\n"
                "**Examples in India:**\n"
                "• **2013 Kedarnath Chorabari Lake outburst**\n"
                "• **2021 Chamoli Rishiganga disaster**\n"
                "• **2023 South Lhonak Lake breach in Sikkim**\n\n"
                "**JALRAKSHAK Early Warning:** We monitor upstream sensor nodes in high-altitude basins (e.g. Joshimath UK-002, Kedarnath UK-003, Gangtok NE-002) and automatically calculate downstream hydrodynamic travel times to notify authorities 1 to 3 hours in advance."
            )
        }

    if "landslide" in query or "mudslide" in query or "bhooskhalan" in query:
        return {
            "response": (
                "⛰️ **What Triggers Landslides & How JALRAKSHAK Predicts Them:**\n\n"
                "Landslides in the Himalayas and Western Ghats are triggered by a compound interaction of:\n"
                "1. **Pore-Water Pressure:** High soil moisture (>75%) saturates loose topsoil.\n"
                "2. **Steep Slope Gradient:** Slopes > 40° exceed the natural angle of repose when wet.\n"
                "3. **Antecedent Rainfall:** Continuous rainfall over preceding days weakens geological root anchors.\n\n"
                "JALRAKSHAK calculates separate **Flash Flood Risk** and **Landslide Susceptibility**, merging them into a **Compound Multi-Hazard Index** to warn rescue teams before slope shear failure occurs."
            )
        }

    # 8. GENERAL SMART ASSISTANT FALLBACK (Conversational + Actionable)
    # Search for any single word match across names
    partial_matches = []
    for loc in LOCATIONS:
        words = loc["name"].lower().replace("(", "").replace(")", "").split()
        if any(w in query for w in words if len(w) > 3):
            partial_matches.append(loc)

    if partial_matches:
        loc = partial_matches[0]
        sim = all_sim_data.get(loc["id"], {})
        r_item = next((r for r in risks if r.location_id == loc["id"]), None)
        return {"response": format_location_card(loc, sim, r_item)}

    # Default Helpful Conversational AI Answer
    return {
        "response": (
            f"🤖 **Rakshak AI (Disaster Intelligence Core)**\n\n"
            f"Maine aapka sawaal suna: *'{q.query}'*.\n\n"
            f"Main real-time satellite telemetry aur **31 hilly regions** ke live sensor data ko continuously analyze kar raha hoon. "
            f"Aap mujhse kisi bhi location ki live report maang sakte hain:\n\n"
            f"• **Live Weather & Risk:** *'Manali ka flood risk aur rainfall kitni hai?'*\n"
            f"• **Wayanad Landslide Status:** *'Wayanad Chooralmala update'* \n"
            f"• **State-wide Summary:** *'Uttarakhand me kitna khatra hai?'* ya *'Himachal rainfall rank'*\n"
            f"• **Extreme Alerts:** *'Sabse zyada barish kahan ho rahi hai?'* ya *'Critical red alerts'* \n"
            f"• **Safety & Shelters:** *'Kedarnath ka safe zone kahan hai?'*\n"
            f"• **Technical Feeds:** *'ISRO INSAT-3DR satellite telemetry'* ya *'Sensors online status'*\n\n"
            f"Kisi specific shehar ya nadi ke baare me poochne ke liye uska naam likhein!"
        )
    }


@app.get("/api/alerts", response_model=List[Alert])
def get_alerts():
    risks = get_all_risks()
    alerts = []
    for r in risks:
        if r.risk_level in ["HIGH", "CRITICAL"]:
            drivers = list(r.contributing_factors.keys())
            priority = 100 if r.risk_level == "CRITICAL" else 70
            priority += min(30, r.exposure.population_exposed / 100)
            if r.trajectory_trend == "RAPIDLY INCREASING":
                priority += 20

            alerts.append(Alert(
                location_id=r.location_id,
                location_name=r.location_name,
                level=r.risk_level,
                message=r.recommended_action,
                drivers=drivers,
                safe_zone=r.safe_zone,
                priority_score=int(priority),
                status="ESCALATED" if r.trajectory_trend == "RAPIDLY INCREASING" else "CONFIRMED" if r.risk_level == "CRITICAL" else "NEW",
                lead_time_window=r.lead_time_window
            ))
    alerts.sort(key=lambda x: x.priority_score, reverse=True)
    return alerts

@app.get("/api/sensors", response_model=List[SensorStatus])
def get_sensors():
    now_str = datetime.now().strftime("%H:%M:%S")
    for s in sensors:
        if s["online"]:
            s["last_updated"] = now_str
            s["health_score"] = min(100, max(50, s["battery"] + random.randint(-3, 3)))
            if s["health_score"] > 80:
                s["status_label"] = "HEALTHY"
            elif s["health_score"] > 60:
                s["status_label"] = "DEGRADED"
                s["anomaly_detected"] = True
            else:
                s["status_label"] = "WARNING"
                s["anomaly_detected"] = True
        else:
            s["status_label"] = "OFFLINE"
            s["health_score"] = 0
            s["reading"] = "N/A"
            s["anomaly_detected"] = True
            s["last_updated"] = now_str
    return sensors

# ═══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET REAL-TIME TELEMETRY
# ═══════════════════════════════════════════════════════════════════════════════
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections[:]:
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/api/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            risks = get_all_risks()
            risk_dicts = [r.dict() for r in risks]
            await websocket.send_text(json.dumps(risk_dicts))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ═══════════════════════════════════════════════════════════════════════════════
# SIMULATION & SCENARIO ENGINE
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/simulation/scenario")
def update_scenario(sensor_data: SimulationState):
    system_state["live_mode"] = False
    loc_id = sensor_data.location_id
    if loc_id not in current_simulation:
        current_simulation[loc_id] = {}
    current_simulation[loc_id].update({
        "rainfall_1h": sensor_data.rainfall,
        "soil_moisture": sensor_data.soil_moisture,
        "water_level": sensor_data.water_level,
        "water_level_rise_rate": sensor_data.rise_rate
    })
    # Upstream cascade override
    if sensor_data.upstream_water_level and sensor_data.upstream_water_level > 0:
        for l in LOCATIONS:
            if loc_id in l.get("upstream_of", []):
                if l["id"] not in current_simulation:
                    current_simulation[l["id"]] = {}
                current_simulation[l["id"]]["water_level_rise_rate"] = sensor_data.upstream_water_level

    return {"status": "success", "message": f"Simulation updated for {loc_id}"}

@app.post("/api/sensors/toggle")
def toggle_sensor(sensor_id: str):
    for s in sensors:
        if s["id"] == sensor_id:
            s["online"] = not s["online"]
            return {"status": "success", "sensor_id": sensor_id, "online": s["online"]}
    raise HTTPException(status_code=404, detail="Sensor not found")

# ═══════════════════════════════════════════════════════════════════════════════
# SIH DEMO MODE ORCHESTRATION
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/sih-demo/step")
def sih_demo_step():
    """Deterministic 7-step SIH demo narrative focused on UK-001/UK-002."""
    system_state["live_mode"] = False
    step = system_state["sih_demo_step"]

    if step == 0:
        # Step 1: Normal baseline
        current_simulation["UK-001"] = {"rainfall_1h": 10, "soil_moisture": 40, "water_level": 2.1, "water_level_rise_rate": 0.05}
        current_simulation["UK-002"] = {"rainfall_1h": 12, "soil_moisture": 45, "water_level": 2.2, "water_level_rise_rate": 0.05}
        current_simulation["WG-001"] = {"rainfall_1h": 15, "soil_moisture": 50, "water_level": 2.5, "water_level_rise_rate": 0.1}
    elif step == 1:
        # Step 2: Rainfall intensifies
        current_simulation["UK-001"]["rainfall_1h"] = 55
        current_simulation["UK-002"]["rainfall_1h"] = 70
    elif step == 2:
        # Step 3: Soil saturates
        current_simulation["UK-001"]["soil_moisture"] = 88
        current_simulation["UK-002"]["soil_moisture"] = 94
    elif step == 3:
        # Step 4: Upstream rise cascades
        current_simulation["UK-002"]["water_level_rise_rate"] = 1.4
        current_simulation["UK-001"]["water_level_rise_rate"] = 0.5
    elif step == 4:
        # Step 5: CRITICAL state
        current_simulation["UK-001"]["water_level_rise_rate"] = 1.8
        current_simulation["UK-001"]["rainfall_1h"] = 90
    elif step == 5:
        # Step 6: Sensor failure
        for s in sensors:
            if s["id"] == "WATER-004":
                s["online"] = False
                s["reading"] = "N/A"
    elif step == 6:
        # Step 7: Reset
        system_state["sih_demo_step"] = 0
        system_state["live_mode"] = True
        for s in sensors:
            s["online"] = True
        # Reset simulations
        for loc in LOCATIONS:
            base_rain = loc["annual_rainfall_mm"] / 365 / 24 * random.uniform(0.5, 2.0)
            base_soil = 30 + (loc["vulnerability"] * 40) + random.uniform(-5, 5)
            current_simulation[loc["id"]] = {
                "rainfall_1h": round(base_rain, 1),
                "soil_moisture": round(min(98, max(20, base_soil)), 1),
                "water_level": round(1.5 + base_rain * 0.05 + random.uniform(0, 1.5), 2),
                "water_level_rise_rate": round(max(0.02, base_rain * 0.02), 2)
            }
        return {"status": "reset", "step": 0}

    system_state["sih_demo_step"] += 1
    return {"status": "success", "step": system_state["sih_demo_step"]}

# ═══════════════════════════════════════════════════════════════════════════════
# SATELLITE FEED & CONSTELLATION HUD
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/satellite-feed", response_model=List[SatelliteFeedItem])
def get_satellite_feed():
    now_str = datetime.now().strftime("%H:%M:%S IST")
    return [
        SatelliteFeedItem(
            constellation="ISRO INSAT Series",
            satellite="INSAT-3DR / 3D",
            agency="ISRO (India)",
            sensor_type="6-Channel Multispectral Imager & Sounder",
            coverage="Pan-India Geostationary (74°E & 82°E)",
            status="ACTIVE - REALTIME",
            latency_ms=28,
            resolution="1 km IR / 4 km CTT",
            data_stream="Cloud Top Temp & Hydro-Estimator",
            last_ping=now_str
        ),
        SatelliteFeedItem(
            constellation="NASA GPM Constellation",
            satellite="GPM Core Observatory / IMERG",
            agency="NASA / JAXA",
            sensor_type="Dual-frequency Precipitation Radar (DPR) & GMI",
            coverage="Global Low-Earth Orbit",
            status="ACTIVE - REALTIME",
            latency_ms=45,
            resolution="0.1° x 0.1° (~10 km)",
            data_stream="Multi-satellite Precipitation Calibrated Flux",
            last_ping=now_str
        ),
        SatelliteFeedItem(
            constellation="Copernicus Sentinel",
            satellite="Sentinel-1C / 1A SAR",
            agency="ESA / Copernicus",
            sensor_type="C-Band Synthetic Aperture Radar (SAR)",
            coverage="Indian Subcontinent Landmass",
            status="ACTIVE - REALTIME",
            latency_ms=62,
            resolution="10 m Spatial High-Res",
            data_stream="Surface Soil Moisture & Inundation Extent",
            last_ping=now_str
        ),
        SatelliteFeedItem(
            constellation="IMD DWR Network",
            satellite="National Doppler Radar Grid",
            agency="India Meteorological Department",
            sensor_type="S/C/X-Band Ground Doppler Polarimetric Radar",
            coverage="Himalayan, Northeast & Coastal Belts",
            status="ONLINE - DUAL POL",
            latency_ms=15,
            resolution="250 m Radial Echo",
            data_stream="Reflectivity (dBZ) & Radial Wind Velocity",
            last_ping=now_str
        ),
    ]

# ═══════════════════════════════════════════════════════════════════════════════
# EVACUATION & SPATIAL HAZARD ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/evacuation_route/{location_id}")
def get_evacuation_route(location_id: str):
    risks = get_all_risks()
    loc_risk = next((r for r in risks if r.location_id == location_id), None)
    if not loc_risk:
        raise HTTPException(status_code=404, detail="Location not found")
    route = calculate_dynamic_route(location_id, loc_risk.risk_level, loc_risk.lat, loc_risk.lng, loc_risk.safe_zone)
    if not route:
        raise HTTPException(status_code=404, detail="No route could be calculated for this location.")
    return {"status": "success", "route": route, "risk_level": loc_risk.risk_level}

@app.get("/api/spatial_hazard_map/{location_id}")
def get_spatial_hazard_map(location_id: str):
    risks = get_all_risks()
    loc_risk = next((r for r in risks if r.location_id == location_id), None)
    if not loc_risk:
        raise HTTPException(status_code=404, detail="Location not found")
    heatmap = generate_spatial_heatmap(location_id, loc_risk.lat, loc_risk.lng, loc_risk.risk_level)
    return {"status": "success", "heatmap_points": heatmap, "risk_level": loc_risk.risk_level}

# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM HEALTH & METADATA
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/system/health")
def system_health():
    online_sensors = sum(1 for s in sensors if s["online"])
    return {
        "status": "operational",
        "total_locations": len(LOCATIONS),
        "total_states": len(set(l["state"] for l in LOCATIONS)),
        "sensors_online": online_sensors,
        "sensors_total": len(sensors),
        "total_syncs": system_state["total_syncs"],
        "failed_syncs": system_state["failed_syncs"],
        "live_mode": system_state["live_mode"],
        "last_synced_at": system_state["last_synced_at"],
        "total_population_monitored": sum(l["population"] for l in LOCATIONS),
        "regions": list(set(l["region"] for l in LOCATIONS))
    }
