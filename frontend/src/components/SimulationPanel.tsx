import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sliders, CloudRain, Droplets, Waves, MapPin, Satellite, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface SimulationPanelProps {
  onUpdate?: () => void;
}

const INDIAN_LOCATIONS = [
  // ── Uttarakhand ──
  { id: "UK-001", name: "Devprayag (Alaknanda Basin)", group: "Uttarakhand" },
  { id: "UK-002", name: "Joshimath / Chamoli Sector", group: "Uttarakhand" },
  { id: "UK-003", name: "Kedarnath Valley (Mandakini)", group: "Uttarakhand" },
  { id: "UK-004", name: "Rudraprayag Sangam", group: "Uttarakhand" },
  { id: "UK-005", name: "Pithoragarh (Kali River)", group: "Uttarakhand" },
  { id: "UK-006", name: "Uttarkashi (Bhagirathi)", group: "Uttarakhand" },
  // ── Himachal Pradesh ──
  { id: "HP-001", name: "Manali (Upper Beas River)", group: "Himachal Pradesh" },
  { id: "HP-002", name: "Kullu - Aut Valley", group: "Himachal Pradesh" },
  { id: "HP-003", name: "Dharamshala (Kangra Hills)", group: "Himachal Pradesh" },
  { id: "HP-004", name: "Shimla Ridge & Tutu", group: "Himachal Pradesh" },
  { id: "HP-005", name: "Kinnaur (Sutlej Gorge)", group: "Himachal Pradesh" },
  { id: "HP-006", name: "Mandi (Beas-Sutlej Link)", group: "Himachal Pradesh" },
  // ── Jammu & Kashmir ──
  { id: "JK-001", name: "Srinagar (Jhelum Floodplain)", group: "J&K" },
  { id: "JK-002", name: "Anantnag (Lidder Valley)", group: "J&K" },
  { id: "JK-003", name: "Rajouri (Pir Panjal)", group: "J&K" },
  // ── Northeast India ──
  { id: "NE-001", name: "Cherrapunji / Sohra, Meghalaya", group: "Northeast" },
  { id: "NE-002", name: "Gangtok (Teesta Basin), Sikkim", group: "Northeast" },
  { id: "NE-003", name: "Haflong (Dima Hasao), Assam", group: "Northeast" },
  { id: "NE-004", name: "Itanagar, Arunachal Pradesh", group: "Northeast" },
  { id: "NE-005", name: "Imphal Valley, Manipur", group: "Northeast" },
  { id: "NE-006", name: "Aizawl (Tlawng Basin), Mizoram", group: "Northeast" },
  { id: "NE-007", name: "Kohima, Nagaland", group: "Northeast" },
  { id: "NE-008", name: "Mawsynram Plateau, Meghalaya", group: "Northeast" },
  // ── Western Ghats & Southern Hills ──
  { id: "WG-001", name: "Wayanad (Chooralmala), Kerala", group: "Western Ghats" },
  { id: "WG-002", name: "Munnar (Muthirapuzha), Kerala", group: "Western Ghats" },
  { id: "WG-003", name: "Mahabaleshwar & Chiplun, Maharashtra", group: "Western Ghats" },
  { id: "WG-004", name: "Coorg / Madikeri, Karnataka", group: "Western Ghats" },
  { id: "WG-005", name: "Nilgiris (Coonoor-Ooty), Tamil Nadu", group: "Western Ghats" },
  { id: "WG-006", name: "Idukki (Periyar Dam Zone), Kerala", group: "Western Ghats" },
  { id: "WG-007", name: "Amboli Ghat, Maharashtra", group: "Western Ghats" },
  { id: "WG-008", name: "Goa Hinterland (Sanguem Ghats)", group: "Western Ghats" },
];

export default function SimulationPanel({ onUpdate }: SimulationPanelProps) {
  const [liveMode, setLiveMode] = useState(false);
  const [params, setParams] = useState({
    location_id: "UK-001",
    rainfall: 15,
    soil_moisture: 45,
    water_level: 2.5,
    rise_rate: 0.1,
    upstream_water_level: 0.0
  });

  useEffect(() => {
    // Fetch initial mode state from backend
    axios.get(`${API_BASE_URL}/api/mode`).then(res => {
      setLiveMode(res.data.live_mode);
    }).catch(console.error);
  }, []);

  const toggleLiveMode = async () => {
    try {
      const newMode = !liveMode;
      setLiveMode(newMode);
      await axios.post(`${API_BASE_URL}/api/mode`, { live_mode: newMode });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Failed to toggle live mode:", err);
    }
  };

  const triggerBackendUpdate = async (updatedParams: typeof params) => {
    try {
      // If we manually slide, UI should show manual mode
      if (liveMode) setLiveMode(false); 
      
      await axios.post(`${API_BASE_URL}/api/simulation/scenario`, updatedParams);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Failed to update simulation scenario:", err);
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    const newParams = { ...params, location_id: locId };
    setParams(newParams);
    if(!liveMode) {
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
    <div className="bg-slate-800/90 p-4 border border-slate-700/80 rounded-xl backdrop-blur-sm relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Sliders size={16} className="text-emerald-400" /> Multi-Source Simulator
        </h3>
        
        {/* Toggle Live Mode Button */}
        <button 
          onClick={toggleLiveMode}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border transition-all ${
            liveMode 
              ? 'bg-blue-900/40 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
              : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
          }`}
        >
          {liveMode ? (
            <><Satellite size={12} className="animate-pulse text-blue-400" /> Live Data ON</>
          ) : (
            <><Zap size={12} /> Live Data OFF</>
          )}
        </button>
      </div>

      {/* Location Selector */}
      <div className="mb-4">
        <label className="text-slate-300 text-xs font-semibold flex items-center gap-1.5 mb-1.5">
          <MapPin size={13} className="text-cyan-400" /> Target Indian Region
        </label>
        <select
          value={params.location_id}
          onChange={handleLocationChange}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500 transition-colors"
        >
          {INDIAN_LOCATIONS.map(loc => (
            <option key={loc.id} value={loc.id}>
              [{loc.group}] {loc.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Overlay when Live Mode is ON */}
      <div className="relative">
        {liveMode && (
            <div className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-[2px] rounded-lg flex flex-col items-center justify-center border border-blue-900/30">
                <Satellite size={28} className="text-blue-400 animate-pulse mb-2" />
                <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">ISRO / IMD Stream Active</span>
                <span className="text-[10px] text-blue-200/70 text-center px-4 mt-1">Real-time parameters are being fetched automatically.<br/>Turn off to simulate disasters manually.</span>
            </div>
        )}

        <div className={liveMode ? 'opacity-30 pointer-events-none' : ''}>
          {/* Presets */}
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => setPreset('normal')}
              className="flex-1 py-1 text-[11px] font-semibold bg-slate-900 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              Normal
            </button>
            <button 
              onClick={() => setPreset('flash_flood')}
              className="flex-1 py-1 text-[11px] font-semibold bg-orange-950/40 hover:bg-orange-900/60 text-orange-300 rounded border border-orange-800/60 transition-colors"
            >
              Flash Flood
            </button>
            <button 
              onClick={() => setPreset('cloudburst')}
              className="flex-1 py-1 text-[11px] font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded border border-red-800/60 transition-colors"
            >
              Cloudburst
            </button>
          </div>
          
          <div className="space-y-3.5">
            <div>
              <div className="text-slate-300 text-xs flex justify-between mb-1">
                <span className="flex items-center gap-1"><CloudRain size={13} className="text-blue-400"/> Rainfall Intensity</span>
                <span className="font-mono text-cyan-300 font-bold">{params.rainfall} mm/hr</span>
              </div>
              <input 
                type="range" 
                name="rainfall" 
                min="0" 
                max="150" 
                value={params.rainfall} 
                onChange={handleChange} 
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500" 
              />
            </div>

            <div>
              <div className="text-slate-300 text-xs flex justify-between mb-1">
                <span className="flex items-center gap-1"><Droplets size={13} className="text-amber-400"/> Soil Saturation</span>
                <span className="font-mono text-amber-300 font-bold">{params.soil_moisture}%</span>
              </div>
              <input 
                type="range" 
                name="soil_moisture" 
                min="0" 
                max="100" 
                value={params.soil_moisture} 
                onChange={handleChange} 
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-500" 
              />
            </div>

            <div>
              <div className="text-slate-300 text-xs flex justify-between mb-1">
                <span className="flex items-center gap-1"><Waves size={13} className="text-cyan-400"/> River Rise Velocity</span>
                <span className="font-mono text-cyan-300 font-bold">{params.rise_rate} m/hr</span>
              </div>
              <input 
                type="range" 
                name="rise_rate" 
                min="0" 
                max="3" 
                step="0.1" 
                value={params.rise_rate} 
                onChange={handleChange} 
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
              />
            </div>

            <div>
              <div className="text-slate-300 text-xs flex justify-between mb-1">
                <span className="flex items-center gap-1"><MapPin size={13} className="text-purple-400"/> Upstream Hazard (Inflow)</span>
                <span className="font-mono text-purple-300 font-bold">+{params.upstream_water_level} m/hr</span>
              </div>
              <input 
                type="range" 
                name="upstream_water_level" 
                min="0" 
                max="3" 
                step="0.1" 
                value={params.upstream_water_level} 
                onChange={handleChange} 
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-500" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}