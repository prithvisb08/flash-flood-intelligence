import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  Activity,
  ArrowLeft,
  Layers,
  ShieldCheck,
  RefreshCw,
  Navigation,
  PlayCircle,
  Users,
  TrendingUp,
  Cpu,
  FileCode2,
  FileText,
  Lock,
  Unlock,
  ShieldAlert,
  Info,
  X,
  Radio,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import SimulationPanel from '../components/SimulationPanel';
import SensorPanel from '../components/SensorPanel';
import MapWrapper from '../components/MapWrapper';
import { MapDigitalTwin } from '../components/MapDigitalTwin';
import RakshakAI from '../components/RakshakAI';
import SatelliteFeed from '../components/SatelliteFeed';
import { API_BASE_URL, WS_BASE_URL } from '../config';
import { type PredictionResult, PredictionResultSchema } from '../schemas';

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
}

function CustomTrajectoryTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-paper-2 border border-rule px-2.5 py-1 rounded text-xs text-ink">
        <span className="text-accent font-medium num">{payload[0].value}% probability</span>
      </div>
    );
  }
  return null;
}

const FILTERS = [
  { id: 'ALL', label: 'All basins' },
  { id: 'CRITICAL', label: 'Critical / High' },
  { id: 'HIMALAYAS', label: 'Himalayas' },
  { id: 'KASHMIR', label: 'Kashmir' },
  { id: 'NORTHEAST', label: 'Northeast' },
  { id: 'GHATS', label: 'Western Ghats' },
] as const;

type FilterType = (typeof FILTERS)[number]['id'];

export default function AdminDashboard() {
  const [riskData, setRiskData] = useState<PredictionResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<PredictionResult | null>(null);

  // Operator Auth & CAP Alert Dispatching State
  const [authToken, setAuthToken] = useState<string>('');
  const [authUsername, setAuthUsername] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [loginUser, setLoginUser] = useState<string>('admin');
  const [loginPass, setLoginPass] = useState<string>('adminpass');
  const [loginError, setLoginError] = useState<string>('');
  const [dispatchStatus, setDispatchStatus] = useState<string>('');

  const handleOpenDigitalTwin = (loc: PredictionResult) => {
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
      const res = await axios.get(`${API_BASE_URL}/api/risk`);
      const parsed = z.array(PredictionResultSchema).safeParse(res.data);
      if (parsed.success) {
        setRiskData(parsed.data);
        setLastSyncTime(
          new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    } catch (err) {
      console.error('Failed to fetch initial telemetry data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
    const ws = new WebSocket(`${WS_BASE_URL}/api/ws/telemetry`);
    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const parsed = z.array(PredictionResultSchema).safeParse(raw);
        if (parsed.success) {
          setRiskData(parsed.data);
          setLastSyncTime(
            new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        }
      } catch (err) {
        console.error('Error parsing websocket data', err);
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

  const handleOperatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', loginUser);
      formData.append('password', loginPass);

      const res = await axios.post(`${API_BASE_URL}/api/token`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      setAuthToken(res.data.access_token);
      setAuthUsername(loginUser);
      setIsAuthModalOpen(false);
    } catch (err) {
      setLoginError('Invalid operator credentials. Please retry.');
      console.error(err);
    }
  };

  const handleDispatchAlert = async (locId: string) => {
    if (!authToken) {
      setIsAuthModalOpen(true);
      return;
    }
    setDispatchStatus(`Dispatching CAP alert for ${locId}…`);
    try {
      await axios.post(
        `${API_BASE_URL}/api/alerts/dispatch`,
        { location_id: locId },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      setDispatchStatus(`Alert successfully broadcast to response network for ${locId}.`);
      setTimeout(() => setDispatchStatus(''), 4000);
    } catch (err) {
      setDispatchStatus('Dispatch failed. Ensure valid operator authorization.');
      setTimeout(() => setDispatchStatus(''), 4000);
    }
  };

  const criticalLocations = riskData.filter(
    (d) => d.risk_level === 'CRITICAL' || d.risk_level === 'HIGH'
  );

  const filteredLocations = riskData.filter((loc) => {
    if (activeFilter === 'CRITICAL') {
      return loc.risk_level === 'CRITICAL' || loc.risk_level === 'HIGH';
    }
    if (activeFilter === 'HIMALAYAS') {
      return loc.location_id.startsWith('UK-') || loc.location_id.startsWith('HP-');
    }
    if (activeFilter === 'KASHMIR') {
      return loc.location_id.startsWith('JK-');
    }
    if (activeFilter === 'NORTHEAST') {
      return loc.location_id.startsWith('NE-');
    }
    if (activeFilter === 'GHATS') {
      return loc.location_id.startsWith('WG-');
    }
    return true;
  });

  const getRiskBadgeClass = (level: string) => {
    if (level === 'CRITICAL') return 'bg-bad-soft border-bad text-bad';
    if (level === 'HIGH') return 'bg-accent-soft border-accent text-accent';
    if (level === 'MODERATE') return 'bg-cool-soft border-cool text-cool';
    return 'bg-ok-soft border-ok text-ok';
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-rule pb-4 mb-5 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              to="/"
              className="text-muted hover:text-ink flex items-center gap-1.5 transition-colors text-xs font-medium focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ArrowLeft size={14} /> Back to portal
            </Link>
            <span className="text-rule-2">|</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-accent bg-paper-2 px-2.5 py-0.5 rounded border border-rule">
              <Radio size={12} className="text-accent" />
              <span>{lastSyncTime ? `Live telemetry: ${lastSyncTime}` : 'Telemetry streaming'}</span>
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-medium text-ink flex items-center gap-2">
            <span>JALRAKSHAK emergency management center</span>
            <span className="text-xs px-2 py-0.5 rounded bg-accent-soft text-accent border border-accent font-medium">
              Operations console
            </span>
          </h1>
          <p className="text-xs md:text-sm text-muted mt-0.5">
            Hydrological decision-support, multi-agency feeds and OASIS CAP 1.2 emergency dispatch
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center">
          <button
            type="button"
            onClick={runDemoStep}
            className="flex-1 md:flex-none px-4 py-2 bg-accent text-accent-ink hover:opacity-90 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
          >
            <PlayCircle size={15} />
            <span>
              {demoStep === 0
                ? 'Start simulation scenario'
                : demoStep >= 6
                ? 'Reset scenario'
                : `Next scenario step (${demoStep}/6)`}
            </span>
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex-1 md:flex-none px-4 py-2 bg-paper-2 hover:bg-paper-3 border border-rule text-ink rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'motion-safe:animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing feeds…' : 'Sync feeds'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex-1 md:flex-none px-3.5 py-2 bg-paper-2 hover:bg-paper-3 rounded-lg border border-rule text-xs font-medium text-ink flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-accent"
          >
            {authToken ? (
              <>
                <Unlock size={14} className="text-ok" />
                <span>Officer {authUsername}</span>
              </>
            ) : (
              <>
                <Lock size={14} className="text-accent" />
                <span>Operator login</span>
              </>
            )}
          </button>

          <div className="flex-1 md:flex-none px-3.5 py-2 bg-paper-2 rounded-lg border border-rule text-center flex flex-col justify-center min-w-[95px]">
            <span
              className={`block text-xl font-medium num ${
                criticalLocations.length > 0 ? 'text-bad' : 'text-muted'
              }`}
            >
              {criticalLocations.length}
            </span>
            <span className="text-xs text-muted">Severe warnings</span>
          </div>

          <div className="flex-1 md:flex-none px-4 py-2 bg-paper-2 rounded-lg border border-rule text-center flex flex-col justify-center min-w-[120px]">
            <span className="block text-sm font-medium text-cool num">1078 / 112</span>
            <span className="text-xs text-muted">24x7 NDRF helpline</span>
          </div>
        </div>
      </header>

      {/* Safety Notice (Ground Rule 4) */}
      <div className="mb-6 p-3.5 bg-paper-2 border border-rule rounded-xl text-xs text-muted flex items-start gap-2.5">
        <Info size={16} className="text-accent shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-ink font-medium">Official safety notice:</strong> Decision-support only. Not a certified emergency warning system. Model predictions, hydrological indices, and satellite telemetry must be verified with qualified hydrological and disaster management authorities (CWC, IMD, NDMA) before executing operational orders.
        </div>
      </div>

      {dispatchStatus && (
        <div className="mb-6 p-3 bg-paper-2 border border-accent rounded-xl text-xs text-accent flex items-center gap-2">
          <ShieldAlert size={15} className="shrink-0" />
          <span>{dispatchStatus}</span>
        </div>
      )}

      {/* Satellite Constellation & Agency Feed HUD */}
      <div className="mb-6">
        <SatelliteFeed onSync={handleManualSync} isSyncing={isSyncing} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: GIS Map & Simulation */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {selectedLocation ? (
            <div
              id="digital-twin-section"
              className="bg-paper-2 border border-accent rounded-2xl p-4 relative min-h-[550px]"
            >
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                className="absolute top-6 right-6 text-ink bg-paper-3 hover:bg-paper-2 py-1.5 px-3 rounded-lg z-[500] text-xs font-medium border border-rule flex items-center gap-1.5 transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X size={14} /> Close digital twin
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
            <div className="bg-paper-2 border border-rule rounded-2xl h-[480px] relative overflow-hidden flex items-center justify-center">
              <MapWrapper locations={riskData} />
              <div className="absolute top-4 left-4 z-[400] bg-paper-2 p-3 rounded-xl border border-rule hidden sm:block">
                <h4 className="text-xs font-medium text-ink mb-2 flex items-center gap-1.5">
                  <Layers size={13} className="text-accent" /> Multi-source GIS grid
                </h4>
                <div className="flex flex-col gap-1 text-xs text-ink-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-bad"></span> Critical (
                    {riskData.filter((r) => r.risk_level === 'CRITICAL').length})
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent"></span> High (
                    {riskData.filter((r) => r.risk_level === 'HIGH').length})
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cool"></span> Moderate (
                    {riskData.filter((r) => r.risk_level === 'MODERATE').length})
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-ok"></span> Low (
                    {riskData.filter((r) => r.risk_level === 'LOW').length})
                  </div>
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
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="text-accent" size={18} />
              <h2 className="text-sm font-medium text-ink">Hyper-local basin intelligence</h2>
            </div>
            <span className="text-xs text-muted flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent"></span> Active
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent ${
                  activeFilter === f.id
                    ? 'bg-accent text-accent-ink'
                    : 'bg-paper-2 hover:bg-paper-3 text-muted border border-rule'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3.5 max-h-[850px] overflow-y-auto pr-1">
            {filteredLocations.map((loc) => (
              <div
                key={loc.location_id}
                className={`p-4 rounded-xl border transition-colors ${
                  loc.risk_level === 'CRITICAL'
                    ? 'bg-bad-soft border-bad'
                    : loc.risk_level === 'HIGH'
                    ? 'bg-accent-soft border-accent'
                    : 'bg-paper-2 border-rule'
                }`}
              >
                {/* Basin Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-ink text-base">{loc.location_name}</h4>
                    <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                      <span className="num">{loc.location_id}</span>
                      <span>·</span>
                      <span
                        className={
                          loc.is_simulated
                            ? 'text-accent font-medium'
                            : 'text-ok font-medium'
                        }
                      >
                        {loc.is_simulated ? 'SIMULATED' : 'DERIVED MODEL'}
                      </span>
                      {loc.exposure && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-ink-2">
                            <Users size={12} className="text-cool" />{' '}
                            <span className="num">{loc.exposure.population_exposed}</span> exposed
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-lg border ${getRiskBadgeClass(
                      loc.risk_level
                    )}`}
                  >
                    {loc.risk_level}
                  </span>
                </div>

                {/* Trajectory & Alert Window */}
                <div className="flex items-center justify-between text-xs font-medium mb-3 bg-paper-3 p-2 rounded-lg border border-rule">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-accent" />
                    <span className="text-muted">Trend:</span>
                    <span className="text-ink">{loc.trajectory_trend}</span>
                  </div>
                  <div className="text-ink">
                    <span className="text-muted">Lead time: </span>
                    <span className="num font-medium text-accent">{loc.lead_time_window}</span>
                  </div>
                </div>

                {/* Satellite Signatures */}
                {loc.satellite_info && (
                  <div className="grid grid-cols-2 gap-2 p-2 bg-paper-3 rounded-lg border border-rule mb-3 text-xs">
                    <div className="flex justify-between text-muted">
                      <span>INSAT-3DR CCT:</span>
                      <span className="text-ink font-medium num">
                        {loc.satellite_info.isro_insat_cct}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>NASA GPM flux:</span>
                      <span className="text-ink font-medium num">
                        {loc.satellite_info.nasa_gpm_flux} mm/h
                      </span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Sentinel-1 soil:</span>
                      <span className="text-ink font-medium num">
                        {loc.satellite_info.sentinel_soil_idx} dB σ°
                      </span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>IMD radar:</span>
                      <span className="text-ink font-medium num">
                        {loc.satellite_info.imd_radar_dbz} dBZ
                      </span>
                    </div>
                  </div>
                )}

                {/* Model Confidence & Compound Hazard */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-muted mb-1">
                      <span>Model confidence</span>
                      <span className="text-ink font-medium num">{loc.confidence}%</span>
                    </div>
                    <div className="w-full bg-paper-3 rounded-full h-1.5 overflow-hidden border border-rule">
                      <div
                        className="h-full bg-accent transition-colors"
                        style={{ width: `${loc.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-medium text-muted mb-1">
                      <span>Compound hazard</span>
                      <span className="text-ink font-medium">{loc.compound_hazard_level}</span>
                    </div>
                    <div className="w-full bg-paper-3 rounded-full h-1.5 overflow-hidden border border-rule">
                      <div
                        className={`h-full transition-colors ${
                          loc.compound_hazard_level === 'CRITICAL' ? 'bg-bad' : 'bg-cool'
                        }`}
                        style={{
                          width: `${
                            loc.compound_hazard_level === 'CRITICAL'
                              ? 100
                              : loc.compound_hazard_level === 'HIGH'
                              ? 70
                              : 35
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Ensemble Model Calibration */}
                {loc.ensemble_data && (
                  <div className="mb-3 text-xs bg-paper-3 p-2 rounded-lg border border-rule">
                    <div className="text-muted font-medium mb-1 flex items-center gap-1.5">
                      <Cpu size={12} className="text-cool" />
                      <span>Calibrated ensemble agreement:</span>
                      <span className="text-ink">{loc.ensemble_data.model_agreement}</span>
                    </div>
                    <div className="flex justify-between text-muted num text-xs">
                      <span>XGB: {loc.ensemble_data.xgboost}%</span>
                      <span>RF: {loc.ensemble_data.random_forest}%</span>
                      <span>LogReg: {loc.ensemble_data.logistic_regression}%</span>
                    </div>
                  </div>
                )}

                {/* 6-Hour Risk Trajectory Chart */}
                <div className="h-16 mb-3">
                  <span className="text-xs text-muted font-medium block mb-1">
                    6-hour risk trajectory
                  </span>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={loc.trajectory}>
                      <CartesianGrid strokeDasharray="2 2" stroke="var(--color-rule)" vertical={false} />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip content={<CustomTrajectoryTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="risk_probability"
                        stroke={
                          loc.risk_level === 'CRITICAL'
                            ? 'var(--color-bad)'
                            : loc.risk_level === 'HIGH'
                            ? 'var(--color-accent)'
                            : 'var(--color-cool)'
                        }
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Explainability (SHAP Factors) */}
                {(Object.keys(loc.contributing_factors).length > 0 ||
                  Object.keys(loc.negative_factors || {}).length > 0) && (
                  <div className="bg-paper-3 rounded-lg p-2.5 mb-3 border border-rule">
                    <span className="text-xs text-muted font-medium block mb-1.5">
                      Hydrological explainability (feature attribution)
                    </span>
                    <div className="space-y-1.5">
                      {Object.entries(loc.contributing_factors).map(([factor, weight]) => (
                        <div key={factor}>
                          <div className="flex justify-between text-xs text-ink-2 mb-0.5">
                            <span>{factor}</span>
                            <span className="text-bad num font-medium">
                              +{Math.round(weight * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-paper rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-bad h-full"
                              style={{ width: `${Math.min(100, weight * 100 * 2)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                      {Object.entries(loc.negative_factors || {}).map(([factor, weight]) => (
                        <div key={factor}>
                          <div className="flex justify-between text-xs text-muted mb-0.5">
                            <span>{factor} (buffer factor)</span>
                            <span className="text-ok num font-medium">
                              -{Math.round(weight * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-paper rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-ok h-full"
                              style={{ width: `${Math.min(100, weight * 100 * 2)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action & Shelter Directive */}
                <div className="flex flex-col gap-2">
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex gap-2 items-start ${
                      loc.risk_level === 'CRITICAL' || loc.risk_level === 'HIGH'
                        ? 'bg-bad-soft border-bad text-ink'
                        : 'bg-paper-3 border-rule text-ink-2'
                    }`}
                  >
                    {loc.risk_level === 'CRITICAL' || loc.risk_level === 'HIGH' ? (
                      <AlertTriangle size={15} className="text-bad shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck size={15} className="text-ok shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-xs font-medium text-muted mb-0.5">
                        Operational directive
                      </div>
                      <div className="leading-snug mb-1">{loc.recommended_action}</div>
                      <div className="text-xs text-ok font-medium">
                        Safe zone shelter: {loc.safe_zone}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDigitalTwin(loc)}
                      className={`font-medium py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98] ${
                        selectedLocation?.location_id === loc.location_id
                          ? 'bg-accent text-accent-ink'
                          : 'bg-paper-3 hover:bg-paper text-ink border border-rule'
                      }`}
                    >
                      <Navigation size={13} />
                      <span>Digital twin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDispatchAlert(loc.location_id)}
                      className="font-medium py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 bg-paper-3 hover:bg-paper text-ink border border-rule focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
                    >
                      <ShieldAlert size={13} className="text-accent" />
                      <span>Dispatch alert</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <a
                      href={`${API_BASE_URL}/api/cap-alert/${loc.location_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1 py-1.5 px-2 bg-paper-3 hover:bg-paper text-muted hover:text-ink rounded border border-rule transition-colors focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <FileCode2 size={12} className="text-accent" />
                      <span>CAP 1.2 XML</span>
                    </a>

                    <a
                      href={`${API_BASE_URL}/api/bulletin/${loc.location_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1 py-1.5 px-2 bg-paper-3 hover:bg-paper text-muted hover:text-ink rounded border border-rule transition-colors focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <FileText size={12} className="text-cool" />
                      <span>PDF bulletin</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operator Login Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[600] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-paper-2 border border-rule rounded-xl max-w-sm w-full p-5 relative">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-medium text-ink mb-1 flex items-center gap-2">
              <Lock size={16} className="text-accent" /> Operator authentication
            </h3>
            <p className="text-xs text-muted mb-4">
              Enter authorized personnel credentials to dispatch emergency notifications.
            </p>

            <form onSubmit={handleOperatorLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Officer ID</label>
                <input
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="w-full p-2 bg-paper-3 border border-rule rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Secret key</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full p-2 bg-paper-3 border border-rule rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors"
                  required
                />
              </div>

              {loginError && <p className="text-xs text-bad">{loginError}</p>}

              <button
                type="submit"
                className="w-full py-2 bg-accent text-accent-ink hover:opacity-90 rounded-lg text-xs font-medium transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent"
              >
                Authenticate session
              </button>
            </form>
          </div>
        </div>
      )}

      <RakshakAI />
    </div>
  );
}
