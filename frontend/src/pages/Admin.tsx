import { useEffect, useState } from 'react';
import axios from 'axios';
import SimulationPanel from '../components/SimulationPanel';
import SensorPanel from '../components/SensorPanel';
import MapWrapper from '../components/MapWrapper';
import { MapDigitalTwin } from '../components/MapDigitalTwin';
import RakshakAI from '../components/RakshakAI';
import SatelliteFeed from '../components/SatelliteFeed';
import { API_BASE_URL, WS_BASE_URL } from '../config';
import { 
  AlertTriangle, Activity, ArrowLeft, Layers, ShieldCheck, RefreshCw, Navigation, PlayCircle, Users, TrendingUp, Cpu
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

interface TrajectoryPoint {
  timestamp: string;
  risk_probability: number;
}

interface SatelliteSourceInfo {
  isro_insat_cct: number;
  nasa_gpm_flux: number;
  sentinel_soil_idx: number;
  imd_radar_dbz: number;
}

interface ModelEnsembleData {
  logistic_regression: number;
  random_forest: number;
  xgboost: number;
  ensemble_score: number;
  model_agreement: string;
}

interface ExposureData {
  population_exposed: number;
  critical_infrastructure: number;
  road_segments_affected: number;
}

interface RiskData {
  location_id: string;
  location_name: string;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  flood_probability: number;
  landslide_probability: number;
  compound_hazard_level: string;
  confidence: number;
  contributing_factors: Record<string, number>;
  negative_factors: Record<string, number>;
  recommended_action: string;
  safe_zone: string;
  trajectory: TrajectoryPoint[];
  trajectory_trend: string;
  lead_time_window: string;
  lat: number;
  lng: number;
  satellite_info?: SatelliteSourceInfo;
  ensemble_data?: ModelEnsembleData;
  exposure?: ExposureData;
}

export default function AdminDashboard() {
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIMALAYAS' | 'KASHMIR' | 'NORTHEAST' | 'GHATS'>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<RiskData | null>(null);

  
  const generateBulletin = (locId: string) => {
    window.open(`${API_BASE_URL}/api/bulletin/${locId}`, '_blank');
  };

  const handleOpenDigitalTwin = (loc: RiskData) => {
    setSelectedLocation(loc);
    setTimeout(() => {
      const el = document.getElementById('digital-twin-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 80);
  };

  const fetchInitialData = async () => {
    try {
      const res = await axios.get<RiskData[]>(`${API_BASE_URL}/api/risk`);
      setRiskData(res.data);
      setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to fetch initial telemetry data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
    const ws = new WebSocket(`${WS_BASE_URL}/api/ws/telemetry`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setRiskData(data);
        setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.error("Error parsing websocket data", err);
      }
    };
    return () => ws.close();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await axios.post(`${API_BASE_URL}/api/sync`);
      await fetchInitialData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 1200);
    }
  };

  const runDemoStep = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/sih-demo/step`);
      setDemoStep(res.data.step);
      await fetchInitialData();
    } catch (err) {
      console.error('Demo step failed', err);
    }
  };

  const criticalLocations = riskData.filter(d => d.risk_level === 'CRITICAL' || d.risk_level === 'HIGH');
  const filteredLocations = riskData.filter(loc => {
    if (activeFilter === 'CRITICAL') return loc.risk_level === 'CRITICAL' || loc.risk_level === 'HIGH';
    if (activeFilter === 'HIMALAYAS') return loc.location_id.startsWith('UK-') || loc.location_id.startsWith('HP-');
    if (activeFilter === 'KASHMIR') return loc.location_id.startsWith('JK-');
    if (activeFilter === 'NORTHEAST') return loc.location_id.startsWith('NE-');
    if (activeFilter === 'GHATS') return loc.location_id.startsWith('WG-');
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 mb-5 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/" className="text-slate-400 font-bold flex items-center gap-1.5 hover:text-white transition-colors text-xs uppercase tracking-widest">
              <ArrowLeft size={14} /> Back to Portal
            </Link>
            <span className="text-slate-600">|</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              {lastSyncTime ? `Live Telemetry: ${lastSyncTime}` : 'Telemetry Streaming'}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white tracking-wider flex items-center gap-3">
            <span className="text-emerald-500">■</span> JALRAKSHAK 2.0
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase tracking-widest">
              COMMAND CENTER
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 uppercase tracking-widest font-medium">
            Multi-Source Satellite & IoT Flash Flood Intelligence Platform
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center">
          <button
            onClick={runDemoStep}
            className="flex-1 md:flex-none px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all active:scale-95 border border-purple-400/50"
          >
            <PlayCircle size={15} className={demoStep > 0 ? 'animate-pulse' : ''} />
            {demoStep === 0 ? 'START SIH DEMO' : demoStep >= 6 ? 'RESET DEMO' : `NEXT DEMO STEP (${demoStep}/6)`}
          </button>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex-1 md:flex-none px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            Sync Feeds
          </button>

          <div className="flex-1 md:flex-none px-3.5 py-2 bg-slate-900 rounded-xl border border-slate-800 text-center flex flex-col justify-center min-w-[95px]">
            <span className={`block text-xl font-black ${criticalLocations.length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
              {criticalLocations.length}
            </span>
            <span className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">Severe Warnings</span>
          </div>

          <div className="flex-1 md:flex-none px-4 py-2 bg-slate-900 rounded-xl border border-blue-900/50 text-center flex flex-col justify-center min-w-[120px] shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <span className="block text-sm font-black text-blue-400">
              1078 / 112
            </span>
            <span className="text-[8px] text-blue-400/80 uppercase tracking-widest font-bold">24x7 NDRF Helpline</span>
          </div>
        </div>
      </header>

      {/* Satellite Constellation & Agency Feed HUD */}
      <div className="mb-6">
        <SatelliteFeed onSync={handleManualSync} isSyncing={isSyncing} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: GIS Map & Simulation */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {selectedLocation ? (
            <div id="digital-twin-section" className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-4 shadow-2xl relative min-h-[550px] ring-4 ring-cyan-500/10">
              <button 
                onClick={() => setSelectedLocation(null)} 
                className="absolute top-6 right-6 text-white bg-slate-800 hover:bg-slate-700 py-1.5 px-3 rounded-lg z-[500] text-xs font-semibold border border-slate-600 shadow-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
              >
                <span>✕</span> Close Digital Twin
              </button>
              <MapDigitalTwin 
                locationId={selectedLocation.location_id}
                lat={selectedLocation.lat}
                lng={selectedLocation.lng}
                locationName={selectedLocation.location_name}
                riskLevel={selectedLocation.risk_level}
              />
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl h-[480px] relative overflow-hidden flex items-center justify-center shadow-2xl">
               <MapWrapper locations={riskData} />
               <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 p-3 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md hidden sm:block">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers size={13} className="text-emerald-400" /> Multi-Source GIS Grid
                  </h4>
                  <div className="flex flex-col gap-1 text-[10px] text-slate-300">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> CRITICAL ({riskData.filter(r => r.risk_level === 'CRITICAL').length})</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> HIGH ({riskData.filter(r => r.risk_level === 'HIGH').length})</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> MODERATE ({riskData.filter(r => r.risk_level === 'MODERATE').length})</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> LOW ({riskData.filter(r => r.risk_level === 'LOW').length})</div>
                  </div>
               </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SimulationPanel />
            <SensorPanel />
          </div>
        </div>

        {/* Right Column: Intelligence Feed & Explainability */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="text-emerald-400" size={18} />
              <h2 className="text-xs uppercase tracking-widest font-black text-white">Hyper-Local Intelligence Feed</h2>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span> Live Stream
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pb-1">
            {(['ALL', 'CRITICAL', 'HIMALAYAS', 'KASHMIR', 'NORTHEAST', 'GHATS'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  activeFilter === f 
                    ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div className="space-y-3.5 max-h-[850px] overflow-y-auto pr-1">
            {filteredLocations.map((loc) => (
              <div key={loc.location_id} className={`p-4 rounded-2xl border transition-all duration-300 ${
                loc.risk_level === 'CRITICAL' ? 'bg-red-950/30 border-red-800/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 
                loc.risk_level === 'HIGH' ? 'bg-orange-950/30 border-orange-800/60' : 
                'bg-slate-900/90 border-slate-800'
              }`}>
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-white text-base leading-snug">{loc.location_name}</h4>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono flex gap-2">
                      {loc.location_id} 
                      {loc.exposure && <span className="flex items-center gap-1 text-slate-300"><Users size={10} className="text-blue-400" /> {loc.exposure.population_exposed} Exposed</span>}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black tracking-widest rounded-lg ${
                    loc.risk_level === 'CRITICAL' ? 'bg-red-500 text-white animate-pulse' : 
                    loc.risk_level === 'HIGH' ? 'bg-orange-500 text-white' : 
                    loc.risk_level === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>{loc.risk_level}</span>
                </div>

                {/* Trajectory & Alert Window */}
                <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider mb-3 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/50">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={12} className={loc.trajectory_trend === 'RAPIDLY INCREASING' ? 'text-red-400 animate-bounce' : 'text-cyan-400'}/>
                    <span className={loc.trajectory_trend.includes('INCREASING') ? 'text-red-300' : 'text-slate-400'}>
                      Trend: {loc.trajectory_trend}
                    </span>
                  </div>
                  <div className="text-orange-300">
                    Lead Time: {loc.lead_time_window}
                  </div>
                </div>

                {/* Multi-Satellite Signatures */}
                {loc.satellite_info && (
                  <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-3 text-[9px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>INSAT-3DR:</span>
                      <span className="text-orange-400 font-bold">{loc.satellite_info.isro_insat_cct}°C</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>NASA GPM:</span>
                      <span className="text-blue-400 font-bold">{loc.satellite_info.nasa_gpm_flux} mm/h</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Sentinel-1:</span>
                      <span className="text-cyan-400 font-bold">{loc.satellite_info.sentinel_soil_idx} dB σ°</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>IMD Radar:</span>
                      <span className="text-emerald-400 font-bold">{loc.satellite_info.imd_radar_dbz} dBZ</span>
                    </div>
                  </div>
                )}
                
                {/* Confidence & Compound Hazard */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                      <span>Model Confidence</span>
                      <span className={loc.confidence < 85 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{loc.confidence}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${loc.confidence < 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${loc.confidence}%` }}></div>
                    </div>
                    {loc.confidence < 85 && <div className="text-[8px] text-amber-500/80 mt-1 uppercase">Sensor Degradation Detected</div>}
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                      <span>Compound Hazard</span>
                      <span className={loc.compound_hazard_level === 'CRITICAL' ? 'text-red-400 font-bold' : 'text-slate-300'}>{loc.compound_hazard_level}</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${loc.compound_hazard_level === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${loc.compound_hazard_level === 'CRITICAL' ? 100 : loc.compound_hazard_level === 'HIGH' ? 70 : 30}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Ensemble Models */}
                {loc.ensemble_data && (
                  <div className="mb-3 text-[9px] bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                     <div className="text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><Cpu size={10} className="text-blue-400"/> Model Ensemble Agreement: <span className="text-blue-300">{loc.ensemble_data.model_agreement}</span></div>
                     <div className="flex justify-between text-slate-500 font-mono">
                        <span>XGB: {loc.ensemble_data.xgboost}%</span>
                        <span>RF: {loc.ensemble_data.random_forest}%</span>
                        <span>LogReg: {loc.ensemble_data.logistic_regression}%</span>
                     </div>
                  </div>
                )}

                {/* Risk Trajectory Graph */}
                <div className="h-16 mb-3">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">6-Hour Risk Trajectory</span>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={loc.trajectory}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px' }}
                        itemStyle={{ color: '#38bdf8' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="risk_probability" 
                        stroke={loc.risk_level === 'CRITICAL' ? '#ef4444' : loc.risk_level === 'HIGH' ? '#f97316' : '#38bdf8'} 
                        strokeWidth={2} 
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Explainable AI (SHAP) */}
                {(Object.keys(loc.contributing_factors).length > 0 || Object.keys(loc.negative_factors || {}).length > 0) && (
                  <div className="bg-slate-950/60 rounded-xl p-2.5 mb-3 border border-slate-800/60">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1.5">Explainability (SHAP Factors)</span>
                    <div className="space-y-1.5">
                      {Object.entries(loc.contributing_factors).map(([factor, weight]) => (
                        <div key={factor}>
                          <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                            <span>{factor}</span>
                            <span className="text-red-400 font-mono font-bold">+{Math.round(weight * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                            <div className="bg-red-500/70 h-full" style={{width: `${Math.min(100, weight * 100 * 2)}%`}}></div>
                          </div>
                        </div>
                      ))}
                      {Object.entries(loc.negative_factors || {}).map(([factor, weight]) => (
                        <div key={factor}>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>{factor} (Risk Reducer)</span>
                            <span className="text-emerald-400 font-mono font-bold">-{Math.round(weight * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                            <div className="bg-emerald-500/70 h-full" style={{width: `${Math.min(100, weight * 100 * 2)}%`}}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action & Safe Zone */}
                <div className="flex flex-col gap-2">
                  <div className={`p-2.5 rounded-xl border text-xs flex gap-2 items-start ${
                    loc.risk_level === 'CRITICAL' || loc.risk_level === 'HIGH' 
                      ? 'bg-red-950/30 border-red-900/40 text-red-200' 
                      : 'bg-slate-950/40 border-slate-800 text-slate-300'
                  }`}>
                    {loc.risk_level === 'CRITICAL' || loc.risk_level === 'HIGH' ? (
                      <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Recommended Protocol</div>
                      <div className="leading-snug mb-1.5">{loc.recommended_action}</div>
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        Safe Zone: {loc.safe_zone}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleOpenDigitalTwin(loc)}
                    className={`w-full font-bold py-2.5 px-4 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-md ${
                      selectedLocation?.location_id === loc.location_id
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400'
                        : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                    }`}
                  >
                    <Navigation size={13} className={selectedLocation?.location_id === loc.location_id ? 'animate-bounce text-white' : ''} />
                    <span>
                      {selectedLocation?.location_id === loc.location_id 
                        ? 'Digital Twin Active (Viewing Map ↑)' 
                        : 'Open Digital Twin & Route'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <RakshakAI />
    </div>
  );
}