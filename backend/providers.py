import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from schemas import (
    LiveWeatherResponse, LiveEarthquakeResponse, LiveEarthquakeItem,
    CISAKEVResponse, CISAVulnerabilityItem, GloFASDischargeResponse
)
from settings import settings


class BaseProvider:
    def __init__(self, ttl_seconds: int = 300):
        self.ttl_seconds = ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}

    def _get_cached(self, key: str) -> Optional[Any]:
        if key in self._cache:
            ts, val = self._cache[key]
            if time.time() - ts < self.ttl_seconds:
                return val
        return None

    def _set_cached(self, key: str, val: Any) -> None:
        self._cache[key] = (time.time(), val)


class OpenMeteoProvider(BaseProvider):
    def __init__(self):
        super().__init__(ttl_seconds=300)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4), reraise=False)
    async def get_live_weather(self, lat: float, lon: float) -> LiveWeatherResponse:
        cache_key = f"weather_{round(lat, 4)}_{round(lon, 4)}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        url = settings.open_meteo_weather_url
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,cloud_cover,soil_moisture_0_to_1cm",
            "timezone": "Asia/Kolkata"
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            curr = data.get("current", {})

            raw_sm = curr.get("soil_moisture_0_to_1cm")
            soil_pct = min(100.0, max(10.0, (float(raw_sm) / 0.50) * 100.0)) if raw_sm is not None else 50.0

            result = LiveWeatherResponse(
                temperature_2m=curr.get("temperature_2m"),
                precipitation=float(curr.get("precipitation") or 0.0),
                relative_humidity_2m=float(curr.get("relative_humidity_2m") or 60.0),
                wind_speed_10m=float(curr.get("wind_speed_10m") or 5.0),
                wind_gusts_10m=float(curr.get("wind_gusts_10m") or 10.0),
                soil_moisture_pct=round(soil_pct, 1),
                cloud_cover=float(curr.get("cloud_cover") or 25.0),
                source="Open-Meteo Real-Time Forecast API",
                fetched_at=datetime.now(timezone.utc).isoformat(),
                is_simulated=False
            )
            self._set_cached(cache_key, result)
            return result

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3), reraise=False)
    async def get_river_discharge(self, lat: float, lon: float) -> GloFASDischargeResponse:
        cache_key = f"flood_{round(lat, 4)}_{round(lon, 4)}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        url = settings.open_meteo_flood_url
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "river_discharge",
            "forecast_days": 1
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    discharges = data.get("daily", {}).get("river_discharge", [])
                    val = float(discharges[0]) if discharges and discharges[0] is not None else None
                    result = GloFASDischargeResponse(
                        river_discharge=val,
                        units="m³/s",
                        source="Copernicus GloFAS via Open-Meteo Flood API",
                        fetched_at=datetime.now(timezone.utc).isoformat(),
                        is_simulated=False
                    )
                    self._set_cached(cache_key, result)
                    return result
        except Exception:
            pass

        return GloFASDischargeResponse(
            river_discharge=None,
            units="m³/s",
            source="GloFAS Flood API (Offline)",
            fetched_at=datetime.now(timezone.utc).isoformat(),
            is_simulated=True
        )


class USGSEarthquakeProvider(BaseProvider):
    def __init__(self):
        super().__init__(ttl_seconds=600)  # 10 min cache

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3), reraise=False)
    async def get_recent_earthquakes(self, limit: int = 15) -> LiveEarthquakeResponse:
        cache_key = f"usgs_eq_{limit}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        url = settings.usgs_earthquake_url
        params = {
            "format": "geojson",
            "minmagnitude": "3.5",
            "limit": limit,
            "orderby": "time"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                features = data.get("features", [])
                items: List[LiveEarthquakeItem] = []
                for f in features:
                    props = f.get("properties", {})
                    geom = f.get("geometry", {})
                    coords = geom.get("coordinates", [0.0, 0.0, 0.0])
                    time_epoch = props.get("time", 0)
                    time_str = datetime.fromtimestamp(time_epoch / 1000.0, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC") if time_epoch else ""
                    items.append(LiveEarthquakeItem(
                        id=str(f.get("id", "")),
                        place=str(props.get("place", "Unknown Location")),
                        magnitude=float(props.get("mag") or 0.0),
                        time=time_str,
                        url=str(props.get("url", "")),
                        coordinates=coords
                    ))
                result = LiveEarthquakeResponse(
                    count=len(items),
                    earthquakes=items,
                    source="USGS Earthquake Hazards Program (Live Feed)",
                    fetched_at=datetime.now(timezone.utc).isoformat(),
                    is_simulated=False
                )
                self._set_cached(cache_key, result)
                return result
        except Exception:
            return LiveEarthquakeResponse(
                count=0,
                earthquakes=[],
                source="USGS Earthquake Feed (Offline / Fallback)",
                fetched_at=datetime.now(timezone.utc).isoformat(),
                is_simulated=True
            )


class CISAKEVProvider(BaseProvider):
    def __init__(self):
        super().__init__(ttl_seconds=3600)  # 1 hour cache

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3), reraise=False)
    async def get_cisa_kev(self, limit: int = 15) -> CISAKEVResponse:
        cache_key = f"cisa_kev_{limit}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        url = settings.cisa_kev_url
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                vulns = data.get("vulnerabilities", [])
                total = len(vulns)
                items: List[CISAVulnerabilityItem] = []
                # Return the most recent entries
                for v in vulns[:limit]:
                    items.append(CISAVulnerabilityItem(
                        cve_id=v.get("cveID", ""),
                        vendor_project=v.get("vendorProject", ""),
                        product=v.get("product", ""),
                        vulnerability_name=v.get("vulnerabilityName", ""),
                        date_added=v.get("dateAdded", ""),
                        short_description=v.get("shortDescription", "")
                    ))
                result = CISAKEVResponse(
                    total_vulnerabilities=total,
                    vulnerabilities=items,
                    source="CISA Known Exploited Vulnerabilities Catalog (Official Feed)",
                    fetched_at=datetime.now(timezone.utc).isoformat(),
                    is_simulated=False
                )
                self._set_cached(cache_key, result)
                return result
        except Exception:
            return CISAKEVResponse(
                total_vulnerabilities=0,
                vulnerabilities=[],
                source="CISA KEV (Offline / Fallback)",
                fetched_at=datetime.now(timezone.utc).isoformat(),
                is_simulated=True
            )


# Global instances
weather_provider = OpenMeteoProvider()
earthquake_provider = USGSEarthquakeProvider()
cisa_provider = CISAKEVProvider()
