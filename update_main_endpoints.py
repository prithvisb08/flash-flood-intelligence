import re

with open('backend/main.py', 'r') as f:
    content = f.read()

# Add endpoints before the RakshakAI query

new_endpoints = """
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
    bulletin = f\"\"\"
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
    \"\"\"
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
"""

content = content.replace('@app.post("/api/ai/query")', new_endpoints)

with open('backend/main.py', 'w') as f:
    f.write(content)
