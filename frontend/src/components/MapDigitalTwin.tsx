import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { API_BASE_URL } from '../config';
import { AlertCircle, Navigation, RefreshCw, Shield, Layers, TrendingUp } from 'lucide-react';
import axios from 'axios';

type HeatmapPoint = [number, number, number] | { lat: number; lng: number; intensity: number };

interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
  risk?: number;
}

interface MapDigitalTwinProps {
  locationId: string;
  lat: number;
  lng: number;
  locationName: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | string;
}

const defaultMarkerIcon = new L.Icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const HeatmapLayer: React.FC<{ points: HeatmapPoint[]; maxIntensity?: number }> = ({
  points,
  maxIntensity = 1.0,
}) => {
  const map = useMap();

  const heatmapPoints = useMemo(
    () =>
      points.map((p: any) => {
        if (Array.isArray(p)) {
          return [p[0], p[1], p[2] ?? 0.5];
        }
        return [p.lat, p.lng, p.intensity ?? 0.5];
      }),
    [points]
  );

  useEffect(() => {
    if (!heatmapPoints || heatmapPoints.length === 0) return;

    try {
      // @ts-ignore
      const heatLayer = L.heatLayer(heatmapPoints, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        max: maxIntensity,
        gradient: {
          0.3: 'oklch(77% 0.12 245)',
          0.6: 'oklch(82% 0.15 80)',
          0.9: 'oklch(70% 0.17 25)',
        },
      }).addTo(map);

      return () => {
        map.removeLayer(heatLayer);
      };
    } catch (e) {
      console.warn('Leaflet.heat error:', e);
    }
  }, [map, heatmapPoints, maxIntensity]);

  return null;
};

const MapController: React.FC<{ center: [number, number]; routeData: RoutePoint[] }> = ({
  center,
  routeData,
}) => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    if (routeData && routeData.length > 1) {
      const bounds = L.latLngBounds(routeData.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView(center, 14);
    }

    return () => clearTimeout(timer);
  }, [map, center[0], center[1], routeData]);

  return null;
};

export function MapDigitalTwin({
  locationId,
  lat,
  lng,
  locationName,
  riskLevel,
}: MapDigitalTwinProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [routeData, setRouteData] = useState<RoutePoint[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'MAP' | 'DEEP_DIVE'>('MAP');
  const [subZones, setSubZones] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'DEEP_DIVE') {
      axios
        .get(`${API_BASE_URL}/api/subcity_zones/${locationId}`)
        .then((res) => setSubZones(res.data.zones || []))
        .catch(console.error);

      axios
        .get(`${API_BASE_URL}/api/historical_compare/${locationId}`)
        .then((res) => setHistoricalData(res.data))
        .catch(console.error);
    }
  }, [activeTab, locationId]);

  const fetchHeatmap = () => {
    setIsRefreshing(true);
    axios
      .get(`${API_BASE_URL}/api/spatial_hazard_map/${locationId}`)
      .then((res) => {
        if (res.data && res.data.heatmap_points) {
          setHeatmapData(res.data.heatmap_points);
        }
      })
      .catch(console.error)
      .finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    fetchHeatmap();
  }, [locationId]);

  const handleGenerateRoute = async () => {
    setLoadingRoute(true);
    setRouteError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/evacuation_route/${locationId}`);
      if (res.data && res.data.route) {
        setRouteData(res.data.route);
      }
    } catch (err: any) {
      setRouteError('No passable evacuation route found. Safe zones may be inaccessible.');
    } finally {
      setLoadingRoute(false);
    }
  };

  const routePath = useMemo(() => {
    return routeData.map((p) => [p.lat, p.lng] as [number, number]);
  }, [routeData]);

  const getRiskTextColor = (level: string) => {
    if (level === 'CRITICAL') return 'text-bad';
    if (level === 'HIGH') return 'text-accent';
    if (level === 'MODERATE') return 'text-cool';
    return 'text-ok';
  };

  return (
    <div className="space-y-3">
      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('MAP')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${
            activeTab === 'MAP'
              ? 'bg-accent text-accent-ink border-accent'
              : 'bg-paper-2 border-rule text-muted hover:text-ink'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Layers size={13} /> Spatial twin & routing
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DEEP_DIVE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${
            activeTab === 'DEEP_DIVE'
              ? 'bg-accent text-accent-ink border-accent'
              : 'bg-paper-2 border-rule text-muted hover:text-ink'
          }`}
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <TrendingUp size={13} /> Basin deep-dive
          </span>
        </button>
      </div>

      {routeError && (
        <div className="p-3 bg-bad-soft border border-bad text-bad rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{routeError}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-wrap justify-between items-center bg-paper-2 p-3.5 rounded-xl border border-rule gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent motion-safe:animate-pulse" />
            <h3 className="text-base font-medium text-ink">
              {locationName} <span className="text-muted text-xs">({locationId})</span>
            </h3>
          </div>
          <p className="text-muted text-xs mt-0.5">
            Spatial flood hazard simulation and automated routing engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHeatmap}
            disabled={isRefreshing}
            className="p-2 bg-paper-3 hover:bg-paper text-muted hover:text-ink rounded-lg text-xs font-normal flex items-center gap-1.5 transition-colors border border-rule active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
            title="Refresh spatial simulation"
          >
            <RefreshCw size={13} className={isRefreshing ? 'motion-safe:animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateRoute}
            disabled={loadingRoute}
            className="bg-accent text-accent-ink hover:opacity-90 font-medium py-2 px-3.5 rounded-lg text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Navigation size={13} className={loadingRoute ? 'motion-safe:animate-spin' : ''} />
            {loadingRoute ? 'Routing…' : 'Compute evacuation route'}
          </button>
        </div>
      </div>

      {activeTab === 'MAP' ? (
        <div className="h-[460px] w-full rounded-xl overflow-hidden border border-rule relative z-0">
          <MapContainer
            center={[lat, lng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            className="dark-map"
          >
            <MapController center={[lat, lng]} routeData={routeData} />

            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            <Marker position={[lat, lng]} icon={defaultMarkerIcon}>
              <Popup className="text-ink">
                <div className="p-1">
                  <strong className="text-sm font-medium block text-ink">{locationName}</strong>
                  <div className="mt-1 text-xs text-muted">
                    Threat classification:{' '}
                    <span className={`font-medium ${getRiskTextColor(riskLevel)}`}>{riskLevel}</span>
                  </div>
                </div>
              </Popup>
            </Marker>

            {heatmapData.length > 0 && <HeatmapLayer points={heatmapData} />}

            {routePath.length > 0 && (
              <Polyline
                positions={routePath}
                color="oklch(77% 0.12 245)"
                weight={4}
                dashArray="6, 6"
                opacity={0.9}
              >
                <Popup>
                  <div className="p-1 text-xs">
                    <strong className="text-cool block">Dynamic evacuation corridor</strong>
                    <span>Path optimized to circumvent high-hazard river inundation zones.</span>
                  </div>
                </Popup>
              </Polyline>
            )}

            {routeData.length > 1 && (
              <Marker
                position={[routeData[routeData.length - 1].lat, routeData[routeData.length - 1].lng]}
                icon={
                  new L.DivIcon({
                    className: 'custom-safe-marker',
                    html: `<div style="background-color: var(--color-ok); width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--color-ink); display: flex; align-items: center; justify-content: center; color: var(--color-paper);">✓</div>`,
                    iconSize: [26, 26],
                    iconAnchor: [13, 13],
                  })
                }
              >
                <Popup className="text-ink">
                  <div className="p-1 text-xs">
                    <strong className="text-ok block text-sm font-medium">Safe shelter destination</strong>
                    <span className="text-ink font-normal">
                      {routeData[routeData.length - 1].name?.replace(/^N\d+_SafeZone_/, '') ||
                        'Elevated shelter grounds'}
                    </span>
                    <div className="mt-1 text-xs text-muted border-t border-rule pt-1">
                      Safe elevation perimeter reached.
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      ) : (
        <div className="p-4 bg-paper-2 border border-rule rounded-xl space-y-4">
          <h4 className="text-sm font-medium text-ink flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" /> Climatological & sub-zone telemetry
          </h4>

          {historicalData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-paper-3 border border-rule">
                <span className="text-xs text-muted block">Current rainfall</span>
                <span className="text-base font-medium text-ink num">
                  {historicalData.today_rainfall_mm} mm
                </span>
              </div>
              <div className="p-3 rounded-lg bg-paper-3 border border-rule">
                <span className="text-xs text-muted block">5-year normal rainfall</span>
                <span className="text-base font-medium text-muted num">
                  {historicalData.avg_5_year_rainfall_mm} mm
                </span>
              </div>
              <div className="p-3 rounded-lg bg-paper-3 border border-rule">
                <span className="text-xs text-muted block">Current temperature</span>
                <span className="text-base font-medium text-ink num">
                  {historicalData.today_temp_c} °C
                </span>
              </div>
              <div className="p-3 rounded-lg bg-paper-3 border border-rule">
                <span className="text-xs text-muted block">Historical anomaly trend</span>
                <span className="text-xs font-medium text-accent">
                  {historicalData.historical_risk_trend}
                </span>
              </div>
            </div>
          )}

          {subZones.length > 0 && (
            <div>
              <span className="text-xs text-muted block mb-2">Micro-grid catchment risk multipliers:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {subZones.map((z, idx) => (
                  <div key={idx} className="p-2 rounded bg-paper-3 border border-rule text-xs">
                    <span className="text-ink block font-medium">{z.name}</span>
                    <span className="text-muted num">Multiplier: {z.risk_multiplier}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MapDigitalTwin;
