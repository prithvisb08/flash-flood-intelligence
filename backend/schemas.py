from pydantic import BaseModel
from typing import List, Dict, Optional

class SensorData(BaseModel):
    rainfall_1h: float
    rainfall_24h: float
    soil_moisture: float
    water_level: float
    water_level_rise_rate: float
    slope_degree: float
    hist_vulnerability: float

class TrajectoryPoint(BaseModel):
    timestamp: str
    risk_probability: float

class SatelliteSourceInfo(BaseModel):
    isro_insat_cct: float
    nasa_gpm_flux: float
    sentinel_soil_idx: float
    imd_radar_dbz: float

class ModelEnsembleData(BaseModel):
    logistic_regression: float
    random_forest: float
    xgboost: float
    ensemble_score: float
    model_agreement: str

class ExposureData(BaseModel):
    population_exposed: int
    critical_infrastructure: int
    road_segments_affected: int

class PredictionResult(BaseModel):
    location_id: str
    location_name: str
    risk_level: str
    flood_probability: float
    landslide_probability: float
    compound_hazard_level: str
    confidence: float
    contributing_factors: Dict[str, float]
    negative_factors: Dict[str, float]
    recommended_action: str
    safe_zone: str
    trajectory: List[TrajectoryPoint]
    trajectory_trend: str # STABLE, INCREASING, RAPIDLY INCREASING, DECREASING
    lead_time_window: str # e.g. "1-3 hours"
    lat: float
    lng: float
    satellite_info: Optional[SatelliteSourceInfo] = None
    ensemble_data: Optional[ModelEnsembleData] = None
    exposure: Optional[ExposureData] = None

class SimulationState(BaseModel):
    rainfall: float
    soil_moisture: float
    water_level: float
    rise_rate: float
    location_id: Optional[str] = "UK-001"
    upstream_water_level: Optional[float] = 0.0

class SensorStatus(BaseModel):
    id: str
    type: str
    reading: str
    battery: int
    online: bool
    last_updated: str
    health_score: int
    status_label: str # HEALTHY, DEGRADED, OFFLINE
    anomaly_detected: bool

class Alert(BaseModel):
    location_id: str
    location_name: str
    level: str
    message: str
    drivers: List[str]
    safe_zone: str
    priority_score: int
    status: str # NEW, CONFIRMED, ESCALATED, RESOLVED
    lead_time_window: str

class SatelliteFeedItem(BaseModel):
    constellation: str
    satellite: str
    agency: str
    sensor_type: str
    coverage: str
    status: str
    latency_ms: int
    resolution: str
    data_stream: str
    last_ping: str
