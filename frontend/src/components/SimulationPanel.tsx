import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sliders, CloudRain, Droplets, Waves, MapPin, Satellite, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface SimulationPanelProps {
  onUpdate?: () => void;
}

const INDIAN_LOCATIONS = [
  { id: 'UK-001', name: 'Devprayag (Alaknanda Basin)', group: 'Uttarakhand' },
  { id: 'UK-002', name: 'Joshimath / Chamoli Sector', group: 'Uttarakhand' },
  { id: 'UK-003', name: 'Kedarnath Valley (Mandakini)', group: 'Uttarakhand' },
  { id: 'UK-004', name: 'Rudraprayag Sangam', group: 'Uttarakhand' },
  { id: 'UK-005', name: 'Pithoragarh (Kali River)', group: 'Uttarakhand' },
  { id: 'UK-006', name: 'Uttarkashi (Bhagirathi)', group: 'Uttarakhand' },
  { id: 'HP-001', name: 'Manali (Upper Beas River)', group: 'Himachal Pradesh' },
  { id: 'HP-002', name: 'Kullu - Aut Valley', group: 'Himachal Pradesh' },
  { id: 'HP-003', name: 'Dharamshala (Kangra Hills)', group: 'Himachal Pradesh' },
  { id: 'HP-004', name: 'Shimla Ridge & Tutu', group: 'Himachal Pradesh' },
  { id: 'HP-005', name: 'Kinnaur (Sutlej Gorge)', group: 'Himachal Pradesh' },
  { id: 'HP-006', name: 'Mandi (Beas-Sutlej Link)', group: 'Himachal Pradesh' },
  { id: 'JK-001', name: 'Srinagar (Jhelum Floodplain)', group: 'J&K' },
  { id: 'JK-002', name: 'Anantnag (Lidder Valley)', group: 'J&K' },
  { id: 'JK-003', name: 'Rajouri (Pir Panjal)', group: 'J&K' },
  { id: 'NE-001', name: 'Cherrapunji / Sohra, Meghalaya', group: 'Northeast' },
  { id: 'NE-002', name: 'Gangtok (Teesta Basin), Sikkim', group: 'Northeast' },
  { id: 'NE-003', name: 'Haflong (Dima Hasao), Assam', group: 'Northeast' },
  { id: 'NE-004', name: 'Itanagar, Arunachal Pradesh', group: 'Northeast' },
  { id: 'NE-005', name: 'Imphal Valley, Manipur', group: 'Northeast' },
  { id: 'NE-006', name: 'Aizawl (Tlawng Basin), Mizoram', group: 'Northeast' },
  { id: 'NE-007', name: 'Kohima, Nagaland', group: 'Northeast' },
  { id: 'NE-008', name: 'Mawsynram Plateau, Meghalaya', group: 'Northeast' },
  { id: 'WG-001', name: 'Wayanad (Chooralmala), Kerala', group: 'Western Ghats' },
  { id: 'WG-002', name: 'Munnar (Muthirapuzha), Kerala', group: 'Western Ghats' },
  { id: 'WG-003', name: 'Mahabaleshwar & Chiplun, Maharashtra', group: 'Western Ghats' },
  { id: 'WG-004', name: 'Coorg / Madikeri, Karnataka', group: 'Western Ghats' },
  { id: 'WG-005', name: 'Nilgiris (Coonoor-Ooty), Tamil Nadu', group: 'Western Ghats' },
  { id: 'WG-006', name: 'Idukki (Periyar Dam Zone), Kerala', group: 'Western Ghats' },
  { id: 'WG-007', name: 'Amboli Ghat, Maharashtra', group: 'Western Ghats' },
  { id: 'WG-008', name: 'Goa Hinterland (Sanguem Ghats)', group: 'Western Ghats' },
];

export default function SimulationPanel({ onUpdate }: SimulationPanelProps) {
  const [liveMode, setLiveMode] = useState(true);
  const [params, setParams] = useState({
    location_id: 'UK-001',
    rainfall: 15,
    soil_moisture: 45,
    water_level: 2.5,
    rise_rate: 0.1,
    upstream_water_level: 0.0,
  });

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/mode`)
      .then((res) => {
        setLiveMode(res.data.live_mode);
      })
      .catch(console.error);
  }, []);

  const toggleLiveMode = async () => {
    try {
      const newMode = !liveMode;
      setLiveMode(newMode);
      await axios.post(`${API_BASE_URL}/api/mode`, { live_mode: newMode });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to toggle live mode:', err);
    }
  };

  const triggerBackendUpdate = async (updatedParams: typeof params) => {
    try {
      if (liveMode) setLiveMode(false);
      await axios.post(`${API_BASE_URL}/api/simulation/scenario`, updatedParams);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to update simulation scenario:', err);
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    const newParams = { ...params, location_id: locId };
    setParams(newParams);
    if (!liveMode) {
      triggerBackendUpdate(newParams);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newParams = { ...params, [name]: parseFloat(value) };
    setParams(newParams);
    triggerBackendUpdate(newParams);
  };

  const setPreset = (type: 'flash_flood' | 'cloudburst' | 'normal') => {
    let presetValues = { rainfall: 15, soil_moisture: 40, water_level: 2.0, rise_rate: 0.1, upstream_water_level: 0.0 };
    if (type === 'flash_flood') {
      presetValues = { rainfall: 110, soil_moisture: 92, water_level: 6.4, rise_rate: 1.5, upstream_water_level: 0.5 };
    } else if (type === 'cloudburst') {
      presetValues = { rainfall: 145, soil_moisture: 98, water_level: 7.8, rise_rate: 2.4, upstream_water_level: 1.2 };
    }
    const newParams = { ...params, ...presetValues };
    setParams(newParams);
    triggerBackendUpdate(newParams);
  };

  return (
    <div className="bg-paper-2 p-4 border border-rule rounded-xl relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-ink font-medium flex items-center gap-2 text-sm">
          <Sliders size={16} className="text-accent" /> Scenario simulation panel
        </h3>

        {/* Toggle Live Mode Button */}
        <button
          type="button"
          onClick={toggleLiveMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-normal border transition-colors whitespace-nowrap text-nowrap active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed bg-paper-3 border-rule text-muted hover:text-ink"
          title="Toggle telemetry mode"
          aria-label="Toggle live telemetry mode"
        >
          {liveMode ? (
            <span className="flex items-center gap-1 text-ok whitespace-nowrap">
              <Satellite size={12} /> Live stream
            </span>
          ) : (
            <span className="flex items-center gap-1 text-accent whitespace-nowrap">
              <Zap size={12} /> Manual mode
            </span>
          )}
        </button>
      </div>

      {/* Location Selector */}
      <div className="mb-4">
        <label className="text-ink-2 text-xs font-medium flex items-center gap-1.5 mb-1.5">
          <MapPin size={13} className="text-accent" /> Target mountain basin
        </label>
        <select
          value={params.location_id}
          onChange={handleLocationChange}
          className="w-full bg-paper-3 border border-rule rounded-lg px-3 py-2 text-xs text-ink font-normal focus:outline-none focus:border-accent transition-colors"
        >
          {INDIAN_LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.id}>
              [{loc.group}] {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status banner */}
      {!liveMode && (
        <div className="mb-3 px-2.5 py-1.5 rounded bg-accent-soft border border-accent text-accent text-xs flex items-center justify-between">
          <span>Simulation active: parameters overridden</span>
          <span className="font-medium px-1.5 py-0.5 rounded bg-accent text-accent-ink text-xs">SIMULATED</span>
        </div>
      )}

      {/* Overlay when Live Mode is ON */}
      <div className="relative">
        {liveMode && (
          <div className="absolute inset-0 z-10 bg-paper-2/90 rounded-lg flex flex-col items-center justify-center border border-rule p-4">
            <Satellite size={24} className="text-ok mb-2" />
            <span className="text-xs font-medium text-ink">Live telemetry stream active</span>
            <span className="text-xs text-muted text-center mt-1">
              Parameters are synced automatically. Turn off to run manual scenario stresses.
            </span>
          </div>
        )}

        <div className={liveMode ? 'opacity-25 pointer-events-none' : ''}>
          {/* Presets */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setPreset('normal')}
              className="flex-1 py-1 text-xs font-normal bg-paper-3 hover:bg-paper text-ink rounded border border-rule transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Normal baseline
            </button>
            <button
              type="button"
              onClick={() => setPreset('flash_flood')}
              className="flex-1 py-1 text-xs font-normal bg-bad-soft text-bad rounded border border-bad transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Flash flood stress
            </button>
            <button
              type="button"
              onClick={() => setPreset('cloudburst')}
              className="flex-1 py-1 text-xs font-normal bg-bad text-ink rounded border border-bad transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cloudburst extreme
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="text-muted text-xs flex justify-between mb-1">
                <span className="flex items-center gap-1">
                  <CloudRain size={13} className="text-cool" /> Precipitation intensity
                </span>
                <span className="text-ink font-medium num">{params.rainfall} mm/hr</span>
              </div>
              <input
                type="range"
                name="rainfall"
                min="0"
                max="150"
                value={params.rainfall}
                onChange={handleChange}
                className="w-full h-1.5 bg-paper rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div>
              <div className="text-muted text-xs flex justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Droplets size={13} className="text-accent" /> Soil saturation
                </span>
                <span className="text-ink font-medium num">{params.soil_moisture}%</span>
              </div>
              <input
                type="range"
                name="soil_moisture"
                min="0"
                max="100"
                value={params.soil_moisture}
                onChange={handleChange}
                className="w-full h-1.5 bg-paper rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div>
              <div className="text-muted text-xs flex justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Waves size={13} className="text-cool" /> River stage surge rate
                </span>
                <span className="text-ink font-medium num">{params.rise_rate} m/hr</span>
              </div>
              <input
                type="range"
                name="rise_rate"
                min="0"
                max="3"
                step="0.1"
                value={params.rise_rate}
                onChange={handleChange}
                className="w-full h-1.5 bg-paper rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div>
              <div className="text-muted text-xs flex justify-between mb-1">
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-accent" /> Upstream cascade inflow
                </span>
                <span className="text-ink font-medium num">+{params.upstream_water_level} m/hr</span>
              </div>
              <input
                type="range"
                name="upstream_water_level"
                min="0"
                max="3"
                step="0.1"
                value={params.upstream_water_level}
                onChange={handleChange}
                className="w-full h-1.5 bg-paper rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
