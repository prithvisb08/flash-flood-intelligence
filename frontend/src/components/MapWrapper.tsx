import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Flame, MapPin } from 'lucide-react';
import { INDIA_BOUNDARY_GEOJSON, INDIA_BOUNDARY_STYLE } from '../data/indiaBoundary';
import type { PredictionResult } from '../schemas';

interface MapProps {
  locations: PredictionResult[];
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

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // @ts-ignore
    const heatLayer = L.heatLayer(points, {
      radius: 40,
      blur: 25,
      maxZoom: 8,
      max: 100,
      gradient: {
        0.3: 'oklch(77% 0.12 245)',
        0.6: 'oklch(82% 0.15 80)',
        0.85: 'oklch(70% 0.17 25)',
      },
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

  const getRiskColor = (risk: string) => {
    if (risk === 'CRITICAL') return 'oklch(70% 0.17 25)';
    if (risk === 'HIGH') return 'oklch(82% 0.15 80)';
    if (risk === 'MODERATE') return 'oklch(77% 0.12 245)';
    return 'oklch(76% 0.15 150)';
  };

  const heatPoints = locations.map(
    (loc) => [loc.lat, loc.lng, loc.flood_probability] as [number, number, number]
  );

  return (
    <div className="h-full w-full relative z-0">
      {/* Top Left Controls: Heatmap Toggle */}
      <div className="absolute top-4 left-4 z-[400] flex gap-2">
        <button
          type="button"
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border whitespace-nowrap active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${
            showHeatmap
              ? 'bg-bad-soft text-bad border-bad'
              : 'bg-paper-2 text-ink border-rule hover:bg-paper-3'
          }`}
        >
          {showHeatmap ? (
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Flame size={13} className="text-bad" /> Heatmap
            </span>
          ) : (
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <MapPin size={13} className="text-accent" /> Markers
            </span>
          )}
        </button>
      </div>

      {/* Quick Region Switcher Overlay */}
      <div className="absolute top-4 right-4 z-[400] flex gap-1 bg-paper-2 p-1.5 rounded-lg border border-rule">
        {(['all_india', 'north_himalayas', 'northeast', 'western_ghats'] as const).map((regionKey) => {
          const labels: Record<string, string> = {
            all_india: 'All India',
            north_himalayas: 'Himalayas',
            northeast: 'Northeast',
            western_ghats: 'Western Ghats',
          };
          const isActive = selectedRegion === regionKey;
          return (
            <button
              type="button"
              key={regionKey}
              onClick={() => setSelectedRegion(regionKey)}
              className={`px-2.5 py-1 rounded text-xs font-normal transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${
                isActive ? 'bg-accent text-accent-ink font-medium' : 'text-muted hover:text-ink hover:bg-paper-3'
              }`}
            >
              {labels[regionKey]}
            </button>
          );
        })}
      </div>

      <MapContainer
        center={REGION_BOUNDS.all_india.center}
        zoom={REGION_BOUNDS.all_india.zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl dark-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSON data={INDIA_BOUNDARY_GEOJSON} style={() => INDIA_BOUNDARY_STYLE} />

        <MapViewHandler target={REGION_BOUNDS[selectedRegion]} />

        {showHeatmap && <HeatmapLayer points={heatPoints} />}

        {!showHeatmap &&
          locations.map((loc) => {
            const color = getRiskColor(loc.risk_level);
            return (
              <CircleMarker
                key={loc.location_id}
                center={[loc.lat, loc.lng]}
                radius={loc.risk_level === 'CRITICAL' ? 14 : 10}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.75,
                  weight: loc.risk_level === 'CRITICAL' ? 3 : 2,
                }}
              >
                <Popup className="bg-paper-2 text-ink rounded-lg border border-rule">
                  <div className="font-sans p-1 text-ink">
                    <div className="font-medium text-sm text-ink mb-1">{loc.location_name}</div>
                    <div className="text-xs text-muted mb-1 flex items-center justify-between">
                      <span>Threat tier:</span>
                      <span className="font-medium text-accent">{loc.risk_level}</span>
                    </div>
                    <div className="text-xs text-muted mb-1">
                      Flash flood prob:{' '}
                      <span className="text-ink font-medium num">{loc.flood_probability}%</span>
                    </div>
                    <div className="text-xs text-muted mb-1">
                      Landslide prob:{' '}
                      <span className="text-ink font-medium num">{loc.landslide_probability}%</span>
                    </div>
                    <div className="text-xs text-ok mt-1 border-t border-rule pt-1">
                      Safe shelter: {loc.safe_zone}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
