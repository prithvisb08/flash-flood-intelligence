import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from risk_engine import calculate_location_risk
from config import LOCATIONS
import joblib


@pytest.fixture(scope="session")
def trained_model():
    model_path = os.path.join(os.path.dirname(__file__), "..", "model_artifacts", "flood_model.joblib")
    if os.path.exists(model_path):
        return joblib.load(model_path)
    return None


def test_risk_engine_determinism_100_runs(trained_model):
    """Ground Rule 2 Proof:
    Identical inputs MUST produce identical outputs across 100 consecutive runs.
    Zero random noise, zero drift, identical float outputs.
    """
    sample_loc = LOCATIONS[0]  # UK-001 Devprayag
    sim_data = {
        "rainfall_1h": 45.5,
        "rainfall_24h": 180.2,
        "soil_moisture": 78.4,
        "water_level": 4.25,
        "water_level_rise_rate": 0.65,
        "dynamic_slope": 38.5,
        "wind_gust": 35.0,
        "snowmelt_rate": 1.2,
        "isro_insat_cct": -48.5,
        "nasa_gpm_flux": 47.7,
        "sentinel_soil_idx": -6.2,
        "imd_radar_dbz": 44.0,
        "is_simulated": False
    }
    history = [12.0, 15.5, 20.0, 18.2, 22.0, 30.5, 38.0]
    telemetry_map = {sample_loc["id"]: sim_data}

    # Reference run
    baseline = calculate_location_risk(
        loc=sample_loc,
        sim_data=sim_data,
        all_locations=LOCATIONS,
        telemetry_by_loc=telemetry_map,
        historical_readings=history,
        model=trained_model,
        seismo_online=True
    )

    # 100 repetitions must match baseline down to the exact float representation
    for i in range(100):
        result = calculate_location_risk(
            loc=sample_loc,
            sim_data=sim_data,
            all_locations=LOCATIONS,
            telemetry_by_loc=telemetry_map,
            historical_readings=history,
            model=trained_model,
            seismo_online=True
        )

        assert result.flood_probability == baseline.flood_probability, f"Drift on run {i}"
        assert result.landslide_probability == baseline.landslide_probability, f"Landslide drift on run {i}"
        assert result.risk_level == baseline.risk_level, f"Risk level changed on run {i}"
        assert result.confidence == baseline.confidence, f"Confidence drift on run {i}"
        assert result.compound_hazard_level == baseline.compound_hazard_level
        assert result.trajectory_trend == baseline.trajectory_trend
        assert len(result.trajectory) == len(baseline.trajectory)
        for t_res, t_base in zip(result.trajectory, baseline.trajectory):
            assert t_res.risk_probability == t_base.risk_probability


def test_spatial_heatmap_determinism():
    """Routing & spatial heatmap must be 100% deterministic (zero random.gauss)."""
    from routing import generate_spatial_heatmap
    
    loc = LOCATIONS[0]
    pts1 = generate_spatial_heatmap(loc["id"], loc["lat"], loc["lng"], "HIGH")
    pts2 = generate_spatial_heatmap(loc["id"], loc["lat"], loc["lng"], "HIGH")

    assert len(pts1) == 100
    assert len(pts2) == 100
    assert pts1 == pts2, "Spatial heatmap generated non-deterministic points!"
