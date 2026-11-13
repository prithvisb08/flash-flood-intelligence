import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from fastapi.testclient import TestClient
from main import app
from settings import settings
from hydrology import get_location_terrain
from config import LOCATIONS


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    login_res = client.post("/api/auth/login", json={
        "username": settings.admin_username,
        "password": settings.admin_password
    })
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_system_health(client):
    res = client.get("/api/system/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"
    assert data["model_loaded"] is True
    assert "disclaimer" in data


def test_risk_endpoint_structure(client):
    res = client.get("/api/risk")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    first = data[0]
    assert "location_id" in first
    assert "flood_probability" in first
    assert "risk_level" in first
    assert "confidence" in first
    assert "trajectory" in first
    assert "disclaimer" in first
    assert "is_simulated" in first
    assert "data_source" in first


def test_official_bulletin_endpoint(client):
    res = client.get("/api/bulletin/UK-001")
    assert res.status_code == 200
    assert "OFFICIAL FLASH FLOOD DISPATCH" in res.text
    assert "DECISION SUPPORT ONLY" in res.text


def test_satellite_feed(client):
    res = client.get("/api/satellite-feed")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 4


def test_sensors_endpoint(client):
    res = client.get("/api/sensors")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 8


def test_subcity_zones(client):
    res = client.get("/api/subcity_zones/UK-001")
    assert res.status_code == 200
    data = res.json()
    assert len(data["zones"]) == 4


def test_spatial_hazard_map(client):
    res = client.get("/api/spatial_hazard_map/UK-001")
    assert res.status_code == 200
    data = res.json()
    assert len(data["heatmap_points"]) == 100


def test_evacuation_route(client):
    res = client.get("/api/evacuation_route/UK-001")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "route" in data


def test_live_cisa_kev_endpoint(client):
    res = client.get("/api/cyber/cisa-kev?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "vulnerabilities" in data
    assert "source" in data


def test_live_earthquakes_endpoint(client):
    res = client.get("/api/risk/earthquakes-live?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "earthquakes" in data
    assert "source" in data


def test_live_weather_endpoint(client):
    res = client.get("/api/risk/weather-live?lat=30.145&lon=78.595")
    assert res.status_code == 200
    data = res.json()
    assert "precipitation" in data
    assert "soil_moisture_pct" in data
    assert "source" in data


def test_hydrology_terrain():
    loc = LOCATIONS[0]
    terrain = get_location_terrain(loc)
    assert "true_slope_deg" in terrain
    assert "dem_elevation_m" in terrain
    assert "hand_m" in terrain
    assert terrain["true_slope_deg"] > 10.0


def test_mode_toggle_and_get(client, auth_headers):
    # Toggle to simulation
    post_res = client.post("/api/mode", json={"live_mode": False, "session_id": "test_sess"}, headers=auth_headers)
    assert post_res.status_code == 200
    assert post_res.json()["live_mode"] is False

    # Get mode
    get_res = client.get("/api/mode?session_id=test_sess")
    assert get_res.status_code == 200
    assert get_res.json()["live_mode"] is False


def test_simulation_scenario_update(client, auth_headers):
    payload = {
        "rainfall": 85.0,
        "soil_moisture": 92.0,
        "water_level": 5.5,
        "rise_rate": 0.8,
        "location_id": "UK-001"
    }
    res = client.post("/api/simulation/scenario?session_id=test_sess", json=payload, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["is_simulated"] is True


def test_sih_demo_step(client, auth_headers):
    res = client.post("/api/sih-demo/step?session_id=demo_sess", headers=auth_headers)
    assert res.status_code == 200
    assert "step" in res.json()


def test_alert_dispatch(client, auth_headers):
    res = client.post("/api/alerts/dispatch", json={"location_id": "UK-001"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"


def test_ai_query(client):
    res = client.post("/api/ai/query", json={"query": "Is Devprayag at risk of flash floods right now?"})
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "disclaimer" in data
