import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { API_BASE_URL } from '../config';
import { AlertCircle, X, Navigation, RefreshCw, Layers, Clock, TrendingUp } from 'lucide-react';
import axios from 'axios';

// Type definitions
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

// Default marker configuration with Leaflet CDN assets to prevent broken marker icons
const defaultMarkerIcon = new L.Icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Heatmap Layer Component using Leaflet.heat
const HeatmapLayer: React.FC<{ points: HeatmapPoint[]; maxIntensity?: number }> = ({ points, maxIntensity = 1.0 }) => {
  const map = useMap();

  const heatmapPoints = useMemo(
    () => points.map((p: any) => {
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
      const heatLayer = (L as any).heatLayer(heatmapPoints, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        max: maxIntensity,
        gradient: {
          0.2: '#06b6d4',
          0.4: '#10b981',
          0.6: '#eab308',
          0.8: '#f97316',
          1.0: '#ef4444'
        }
      }).addTo(map);

      return () => {
        map.removeLayer(heatLayer);
      };
    } catch (e) {
      console.warn("Leaflet.heat error:", e);
    }
  }, [map, heatmapPoints, maxIntensity]);

  return null;
};

// Map controller to handle proper tile sizing and auto-zoom when route appears
const MapController: React.FC<{ center: [number, number]; routeData: RoutePoint[] }> = ({ center, routeData }) => {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size to prevent blank/gray tiles on dynamic container mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    if (routeData && routeData.length > 1) {
      const bounds = L.latLngBounds(routeData.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView(center, 14);
    }

    return () => clearTimeout(timer);
  }, [map, center[0], center[1], routeData]);

  return null;
};

// Inline Alert Notification Component
const InlineNotification: React.FC<{
  type?: 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
}> = ({ message, onClose }) => (
  <div className="flex items-center justify-between gap-2 p-3 bg-red-950/80 border border-red-800/80 text-red-200 text-xs rounded-xl shadow-lg">
    <div className="flex items-center gap-2">
      <AlertCircle size={16} className="text-red-400 shrink-0" />
      <span>{message}</span>
    </div>
    <button
      onClick={onClose}
      className="text-red-400 hover:text-white transition-colors p-0.5 rounded"
      aria-label="Dismiss error"
    >
      <X size={14} />
    </button>
  </div>
);

export const MapDigitalTwin: React.FC<MapDigitalTwinProps> = ({
  locationId,
  lat,
  lng,
  locationName,
  riskLevel
}) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [routeData, setRouteData] = useState<RoutePoint[]>([]);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/spatial_hazard_map/${locationId}`);
      if (!response.ok) throw new Error('Failed to fetch hazard map');
      const result = await response.json();
      
      // Backend returns { status: "success", heatmap_points: [...] }
      if (result.heatmap_points) {
        setHeatmapData(result.heatmap_points);
      } else if (result.data?.heatmap_points) {
        setHeatmapData(result.data.heatmap_points);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load heatmap data:', err);
      setError('Could not connect to Spatial Hazard API');
    } finally {
      setIsRefreshing(false);
    }
  }, [locationId]);

  const handleGenerateRoute = useCallback(async () => {
    setLoadingRoute(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/evacuation_route/${locationId}`);
      if (!response.ok) throw new Error('Failed to fetch evacuation route');
      const result = await response.json();

      // Backend returns { status: "success", route: [...] }
      if (result.route) {
        setRouteData(result.route);
      } else if (result.data?.route) {
        setRouteData(result.data.route);
      }
    } catch (err) {
      console.error('Failed to generate route:', err);
      setError('Could not calculate safe evacuation route');
    } finally {
      setLoadingRoute(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchHeatmap();
    handleGenerateRoute();
    const interval = setInterval(fetchHeatmap, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [fetchHeatmap, handleGenerateRoute]);

  const routePath = useMemo<[number, number][]>(
    () => routeData.map(p => [p.lat, p.lng]),
    [routeData]
  );

  return (
    <div className="flex flex-col gap-3 w-full">
      {error && (
        <InlineNotification message={error} onClose={() => setError(null)} />
      )}

      {/* Header bar */}
      <div className="flex flex-wrap justify-between items-center bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <h3 className="text-base font-bold text-white tracking-wide">
              {locationName} <span className="text-slate-400 text-xs font-mono">({locationId})</span>
            </h3>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">
            Real-time ConvLSTM Spatial Heatmap & Safe Routing Simulation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHeatmap}
            disabled={isRefreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 disabled:opacity-50"
            title="Refresh Heatmap"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleGenerateRoute}
            disabled={loadingRoute}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2 px-3.5 rounded-lg text-xs transition-all shadow-md shadow-blue-900/30 disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
          >
            <Navigation size={13} className={loadingRoute ? 'animate-spin' : ''} />
            {loadingRoute ? 'Routing...' : 'Calculate AI Evacuation Route'}
          </button>
        </div>
      </div>

      {/* Map View */}
      <div className="h-[460px] w-full rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative z-0">
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          className="dark-map"
        >
          <MapController center={[lat, lng]} routeData={routeData} />

          {/* Free OpenStreetMap Tile Layer (dark theme via CSS filter) */}
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Location Marker */}
          <Marker position={[lat, lng]} icon={defaultMarkerIcon}>
            <Popup className="text-slate-900">
              <div className="p-1">
                <strong className="text-sm font-bold block">{locationName}</strong>
                <div className="mt-1 text-xs">
                  Risk Level:{' '}
                  <span
                    className="font-black"
                    style={{
                      color:
                        riskLevel === 'CRITICAL'
                          ? '#ef4444'
                          : riskLevel === 'HIGH'
                          ? '#f97316'
                          : riskLevel === 'MODERATE'
                          ? '#eab308'
                          : '#10b981'
                    }}
                  >
                    {riskLevel}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>

          {/* ConvLSTM Spatial Flood Hazard Heatmap */}
          {heatmapData.length > 0 && <HeatmapLayer points={heatmapData} />}

          {/* AI Evacuation Safe Route Polyline */}
          {routePath.length > 0 && (
            <Polyline
              positions={routePath}
              color="#38bdf8"
              weight={5}
              dashArray="8, 8"
              opacity={0.9}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <strong className="text-blue-600 block">AI Dynamic Safe Route</strong>
                  <span>Optimized evacuation path avoiding high-risk inundation zones.</span>
                </div>
              </Popup>
            </Polyline>
          )}

          {/* Safe Zone Destination Marker */}
          {routeData.length > 1 && (
            <Marker 
              position={[routeData[routeData.length - 1].lat, routeData[routeData.length - 1].lng]}
              icon={new L.DivIcon({
                className: 'custom-safe-marker',
                html: `<div style="background-color: #10b981; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 14px #10b981; display: flex; align-items: center; justify-content: center; font-size: 14px;">🛡️</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              })}
            >
              <Popup className="text-slate-900">
                <div className="p-1 text-xs">
                  <strong className="text-emerald-600 block text-sm font-bold">🏁 Designated Safe Shelter</strong>
                  <span className="font-semibold text-slate-700">{routeData[routeData.length - 1].name?.replace(/^N\d+_SafeZone_/, '') || 'Safe Zone High Grounds'}</span>
                  <div className="mt-1 text-[10px] text-emerald-700 bg-emerald-50 p-1 rounded border border-emerald-200">
                    Safe elevation reached. Evacuation route terminus.
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapDigitalTwin;
