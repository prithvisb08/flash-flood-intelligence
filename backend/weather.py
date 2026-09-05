import os
import requests
from functools import lru_cache
from typing import Dict, Any

# Base URL for Open-Meteo (free, no API key). Can be overridden via env.
BASE_URL = os.getenv('WEATHER_API_BASE', 'https://api.open-meteo.com/v1/forecast')
ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation'
HISTORICAL_URL = 'https://archive-api.open-meteo.com/v1/archive'

@lru_cache(maxsize=128)
def fetch_weather(lat: float, lon: float) -> Dict[str, Any]:
    """Fetch current weather data for given latitude and longitude.
    Returns a dict with keys: temperature (°C), precipitation (mm), humidity (%), wind_speed (km/h), 
    snowfall (cm), wind_gusts_10m (km/h).
    The result is cached for 15 minutes to avoid excessive API calls.
    """
    params = {
        'latitude': lat,
        'longitude': lon,
        'current': 'temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,snowfall',
        'timezone': 'Asia/Kolkata'
    }
    try:
        resp = requests.get(BASE_URL, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        current = data.get('current', {})
        return {
            'temperature': current.get('temperature_2m'),
            'precipitation': current.get('precipitation'),
            'humidity': current.get('relative_humidity_2m'),
            'wind_speed': current.get('wind_speed_10m'),
            'wind_gust': current.get('wind_gusts_10m'),
            'snowmelt_rate': current.get('snowfall') # Using snowfall as proxy
        }
    except Exception:
        return {
            'temperature': None,
            'precipitation': None,
            'humidity': None,
            'wind_speed': None,
            'wind_gust': None,
            'snowmelt_rate': None
        }

@lru_cache(maxsize=128)
def fetch_elevation(lat: float, lon: float) -> float:
    """Fetch elevation (DEM) to dynamically calculate slope velocity factor."""
    params = {'latitude': lat, 'longitude': lon}
    try:
        resp = requests.get(ELEVATION_URL, params=params, timeout=5)
        resp.raise_for_status()
        elevations = resp.json().get('elevation', [])
        return elevations[0] if elevations else 0.0
    except Exception:
        return 0.0

def fetch_historical_compare(lat: float, lon: float) -> Dict[str, Any]:
    """Mock fetch 5-year historical average for today's date for 'City Deep Dive'"""
    # In a real scenario, this would query HISTORICAL_URL for the past 5 years.
    # For demo purposes, we return a simulated comparison
    import random
    return {
        "today_rainfall_mm": round(random.uniform(10, 150), 1),
        "avg_5_year_rainfall_mm": round(random.uniform(5, 50), 1),
        "today_temp_c": round(random.uniform(15, 30), 1),
        "avg_5_year_temp_c": round(random.uniform(15, 28), 1),
        "historical_risk_trend": random.choice(["HIGHER_THAN_NORMAL", "NORMAL", "LOWER_THAN_NORMAL"])
    }
