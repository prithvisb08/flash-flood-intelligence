import re

with open('backend/main.py', 'r') as f:
    content = f.read()

# Fix indentation in sync_single_location and add wind_gust, snowmelt
old_sync = """        else:
            # Use default fallback values when API request fails
            cloud_cover = 40.0
            wind_speed = 5.0
            humidity = 60.0

            soil_pct = min(100.0, max(15.0, soil_raw * 100.0 if soil_raw <= 1.0 else soil_raw))

            # Derived hydrological parameters with terrain adjustment
            slope_factor = loc["base_slope"] / 60.0
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
                "last_updated": datetime.now().strftime("%H:%M:%S IST")
            }
            live_data_cache[loc["id"]] = entry

            # Store for anomaly detection rolling window
            historical_readings[loc["id"]].append(rain_mm)
            if len(historical_readings[loc["id"]]) > 30:
                historical_readings[loc["id"]] = historical_readings[loc["id"]][-30:]
            return"""

new_sync = """        else:
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
        return"""

content = content.replace(old_sync, new_sync)

# Update risk logic
old_risk = """        # ─── Multi-Factor Physical Risk Score ───
        rain_score = sim_data["rainfall_1h"] * 0.45
        soil_score = sim_data["soil_moisture"] * 0.25
        rise_score = sim_data["water_level_rise_rate"] * 35
        slope_score = (loc["base_slope"] / 60.0) * 15
        vuln_score = loc["vulnerability"] * 12

        physical_risk = rain_score + soil_score + rise_score + slope_score + vuln_score"""

new_risk = """        # ─── Multi-Factor Physical Risk Score ───
        rain_score = sim_data["rainfall_1h"] * 0.45
        soil_score = sim_data["soil_moisture"] * 0.25
        rise_score = sim_data["water_level_rise_rate"] * 35
        
        dyn_slope = sim_data.get("dynamic_slope", loc["base_slope"])
        slope_score = (dyn_slope / 60.0) * 15
        vuln_score = loc["vulnerability"] * 12
        
        wind_gust_score = min(15, sim_data.get("wind_gust", 0) * 0.15)
        snowmelt_score = min(20, sim_data.get("snowmelt_rate", 0) * 2.0)

        physical_risk = rain_score + soil_score + rise_score + slope_score + vuln_score + wind_gust_score + snowmelt_score"""

content = content.replace(old_risk, new_risk)

# Update pos factors
old_pos = """        if loc['base_slope'] > 45:
            pos_factors['Steep Topography (>{0}°)'.format(loc['base_slope'])] = round(loc['base_slope'] / 90, 2)"""

new_pos = """        dyn_slope = sim_data.get("dynamic_slope", loc["base_slope"])
        if dyn_slope > 45:
            pos_factors['Steep Topography (>{0}°)'.format(round(dyn_slope))] = round(dyn_slope / 90, 2)
        if sim_data.get('wind_gust', 0) > 40:
            pos_factors['High Wind Gust (>40 km/h)'] = round(sim_data['wind_gust'] / 100, 2)
        if sim_data.get('snowmelt_rate', 0) > 2:
            pos_factors['Rapid Snowmelt Detected'] = 0.25"""

content = content.replace(old_pos, new_pos)

with open('backend/main.py', 'w') as f:
    f.write(content)
