import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { INDIA_BOUNDARY_GEOJSON, INDIA_BOUNDARY_STYLE } from '../data/indiaBoundary';

interface RiskData {
  location_id: string;
  location_name: string;
  risk_level: string;
  lat: number;
  lng: number;
  flood_probability: number;
  landslide_probability: number;
  safe_zone: string;
}

interface MapProps {
  locations: RiskData[];
}

const REGION_BOUNDS: Record<string, { center: [number, number]; zoom: number }> = {
  all_india: { center: [23.5, 82.0], zoom: 5 },
  north_himalayas: { center: [31.2, 78.2], zoom: 7 },
  northeast: { center: [26.2, 92.2], zoom: 7 },
  western_ghats: { center: [13.8, 75.8], zoom: 6 },
};

function MapViewHandler({ target }: { target: { center: [number, number]; zoom: number } }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(target.center, target.zoom, { duration: 1.2 });
  }, [target, map]);
  return null;
}

// Custom Heatmap Layer for React-Leaflet
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!points || points.length === 0) return;
    
    // Create heat layer
    // @ts-ignore - leaflet.heat extends L globally but types might be missing
    const heatLayer = L.heatLayer(points, {
      radius: 40,
      blur: 25,
      maxZoom: 8,
      max: 100, // Max intensity (flood probability goes up to 100)
      gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        0.9: 'orange',
        1.0: 'red'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);
  
  return null;
}

export default function MapWrapper({ locations }: MapProps) {
  const [selectedRegion, setSelectedRegion] = useState('all_india');
  const [showHeatmap, setShowHeatmap] = useState(false);

  const getColor = (risk: string) => {
    if (risk === 'CRITICAL') return '#ef4444'; // red
    if (risk === 'HIGH') return '#f97316';     // orange
    if (risk === 'MODERATE') return '#eab308'; // yellow
    return '#38bdf8';                          // cyan/blue
  };

  // Prepare heatmap data: [lat, lng, intensity]
  const heatPoints = locations.map(loc => [
    loc.lat, 
    loc.lng, 
    loc.flood_probability // Use probability as heat intensity
  ] as [number, number, number]);

  return (
    <div className="h-full w-full relative z-0">
      {/* Top Left Controls: Heatmap Toggle */}
      <div className="absolute top-4 left-4 z-[400] flex gap-2">
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border shadow-lg backdrop-blur-md ${
            showHeatmap 
              ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30' 
              : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          {showHeatmap ? '🔥 Heatmap Active' : '📍 Point Markers'}
        </button>
      </div>

      {/* Quick Region Switcher Overlay */}
      <div className="absolute top-4 right-4 z-[400] flex gap-1.5 bg-slate-900/90 p-1.5 rounded-lg border border-slate-700/80 shadow-xl backdrop-blur-sm">
        <button
          onClick={() => setSelectedRegion('all_india')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${selectedRegion === 'all_india' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          All India
        </button>
        <button
          onClick={() => setSelectedRegion('north_himalayas')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${selectedRegion === 'north_himalayas' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Himalayas
        </button>
        <button
          onClick={() => setSelectedRegion('northeast')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${selectedRegion === 'northeast' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Northeast
        </button>
        <button
          onClick={() => setSelectedRegion('western_ghats')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${selectedRegion === 'western_ghats' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Western Ghats
        </button>
      </div>

      <MapContainer 
        center={REGION_BOUNDS.all_india.center} 
        zoom={REGION_BOUNDS.all_india.zoom} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl dark-map"
      >
        {/* Free OpenStreetMap tiles with dark CSS filter applied via className */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* India Official Boundary Overlay (SOI compliant — includes PoK, Aksai Chin) */}
        <GeoJSON 
          data={INDIA_BOUNDARY_GEOJSON} 
          style={() => INDIA_BOUNDARY_STYLE}
        />

        <MapViewHandler target={REGION_BOUNDS[selectedRegion]} />
        
        {showHeatmap && <HeatmapLayer points={heatPoints} />}
        
        {!showHeatmap && locations.map((loc) => (
          <CircleMarker
            key={loc.location_id}
            center={[loc.lat, loc.lng]}
            radius={loc.risk_level === 'CRITICAL' ? 14 : 10}
            pathOptions={{ 
              color: getColor(loc.risk_level), 
              fillColor: getColor(loc.risk_level), 
              fillOpacity: 0.75,
              weight: loc.risk_level === 'CRITICAL' ? 3 : 2
            }}
          >
            <Popup className="bg-slate-900 text-slate-100 rounded-lg">
              <div className="font-sans p-1">
                <div className="font-bold text-base text-white mb-1">{loc.location_name}</div>
                <div className="text-xs text-slate-300 mb-1 flex items-center justify-between">
                  <span>Risk Status:</span>
                  <span className="font-bold px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${getColor(loc.risk_level)}33`, color: getColor(loc.risk_level) }}>
                    {loc.risk_level}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mb-1">
                  Flash Flood Prob: <b className="text-cyan-300">{loc.flood_probability}%</b>
                </div>
                <div className="text-xs text-slate-300 mb-1">
                  Landslide Prob: <b className="text-amber-300">{loc.landslide_probability}%</b>
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-1 border-t border-slate-700 pt-1">
                  Safe Zone: {loc.safe_zone}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
