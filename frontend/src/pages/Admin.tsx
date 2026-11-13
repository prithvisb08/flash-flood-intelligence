import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {
  Activity,
  ArrowLeft,
  Layers,
  ShieldCheck,
  RefreshCw,
  Navigation,
  PlayCircle,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  FileCode2,
  FileText,
  Lock,
  Unlock,
  ShieldAlert,
  X,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import SimulationPanel from '../components/SimulationPanel';
import SensorPanel from '../components/SensorPanel';
import MapWrapper from '../components/MapWrapper';
import { MapDigitalTwin } from '../components/MapDigitalTwin';
import RakshakAI from '../components/RakshakAI';
import SatelliteFeed from '../components/SatelliteFeed';
import {
  RiskBadge,
  SourceTag,
  StatCard,
  AlertBanner,
  type AlertItem,
  DisclaimerBar,
  ThemeToggle,
  EmptyState,
} from '../components/ui';
import { API_BASE_URL, WS_BASE_URL } from '../config';
import { type PredictionResult, PredictionResultSchema } from '../schemas';

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTrajectoryTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-paper-2 border border-rule px-2.5 py-1.5 rounded text-xs text-ink shadow-sm">
        <div className="text-muted text-xs mb-0.5">{label}</div>
        <div className="text-accent font-medium num">{payload[0].value}% probability</div>
      </div>
    );
  }
  return null;
}

const REGION_FILTERS = [
  { id: 'ALL', label: 'All catchments' },
  { id: 'CRITICAL', label: 'Critical / High' },
  { id: 'HIMALAYAS', label: 'Himalayas' },
  { id: 'KASHMIR', label: 'Kashmir' },
  { id: 'NORTHEAST', label: 'Northeast' },
  { id: 'GHATS', label: 'Western Ghats' },
] as const;

type RegionFilter = (typeof REGION_FILTERS)[number]['id'];

export default function AdminDashboard() {
  const [riskData, setRiskData] = useState<PredictionResult[]>([]);
  const [activeRegion, setActiveRegion] = useState<RegionFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<PredictionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'intel'>('map');

  // Search input ref for keyboard shortcut "/"
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Operator Auth & CAP Alert Dispatching State
  const [authToken, setAuthToken] = useState<string>('');
  const [authUsername, setAuthUsername] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [loginUser, setLoginUser] = useState<string>('admin');
  const [loginPass, setLoginPass] = useState<string>('adminpass');
  const [loginError, setLoginError] = useState<string>('');
  const [dispatchStatus, setDispatchStatus] = useState<string>('');

  // Keyboard shortcut listener: "/" focuses search, "Escape" closes modal/drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (isAuthModalOpen) setIsAuthModalOpen(false);
        else if (selectedLocation) setSelectedLocation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, selectedLocation]);

  const fetchInitialData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/risk`);
      const parsed = z.array(PredictionResultSchema).safeParse(res.data);
      if (parsed.success) {
        setRiskData(parsed.data);
        if (!selectedLocation && parsed.data.length > 0) {
          setSelectedLocation(parsed.data[0]);
        }
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
      setLoginError('Invalid credentials. Please retry.');
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
      setDispatchStatus(`CAP 1.2 alert dispatched to response network for ${locId}.`);
      setTimeout(() => setDispatchStatus(''), 4000);
    } catch (err) {
      setDispatchStatus('Dispatch failed. Please check operator authorization.');
      setTimeout(() => setDispatchStatus(''), 4000);
    }
  };

  // Convert critical/high risk locations to AlertItems for AlertBanner
  const alertItems: AlertItem[] = riskData
    .filter((loc) => loc.risk_level === 'CRITICAL' || loc.risk_level === 'HIGH')
    .map((loc) => ({
      id: loc.location_id,
      locationId: loc.location_id,
      locationName: loc.location_name,
      riskLevel: loc.risk_level,
      headline: `${loc.flood_probability}% flood surge probability. Directive: ${loc.recommended_action}`,
      issuedAt: lastSyncTime ? `Telemetry ${lastSyncTime}` : 'Active alert',
    }));

  // Filtering locations by region tab and search query
  const filteredLocations = riskData.filter((loc) => {
    const matchesRegion =
      activeRegion === 'ALL'
        ? true
        : activeRegion === 'CRITICAL'
        ? loc.risk_level === 'CRITICAL' || loc.risk_level === 'HIGH'
        : activeRegion === 'HIMALAYAS'
        ? loc.location_id.startsWith('UK-') || loc.location_id.startsWith('HP-')
        : activeRegion === 'KASHMIR'
        ? loc.location_id.startsWith('JK-')
        : activeRegion === 'NORTHEAST'
        ? loc.location_id.startsWith('NE-')
        : loc.location_id.startsWith('WG-');

    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : loc.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.location_id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesRegion && matchesSearch;
  });

  const getTrendIcon = (trend: string) => {
    if (trend.includes('INCREASING')) {
      return <TrendingUp size={13} className="text-bad" aria-hidden="true" />;
    }
    if (trend.includes('DECREASING')) {
      return <TrendingDown size={13} className="text-ok" aria-hidden="true" />;
    }
    return <Minus size={13} className="text-muted" aria-hidden="true" />;
  };

  const criticalCount = riskData.filter((r) => r.risk_level === 'CRITICAL').length;
  const highCount = riskData.filter((r) => r.risk_level === 'HIGH').length;

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col antialiased">
      {/* 1. Thin & Quiet Top Bar */}
      <header className="h-13 bg-paper-2 border-b border-rule px-4 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-muted hover:text-ink flex items-center gap-1.5 transition-colors text-xs font-medium focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Portal</span>
          </Link>
          <span className="text-rule-2">/</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-ink">JALRAKSHAK</span>
            <span className="text-xs px-2 py-0.5 rounded bg-paper-3 text-muted border border-rule font-medium">
              Operations console
            </span>
          </div>
        </div>

        {/* Global Telemetry & Status Readouts */}
        <div className="flex items-center gap-2.5 sm:gap-4 text-xs">
          <div className="hidden lg:flex items-center gap-2 text-muted">
            <span className="w-2 h-2 rounded-full bg-ok shrink-0" aria-hidden="true"></span>
            <span>{lastSyncTime ? `Sync: ${lastSyncTime}` : 'Telemetry streaming'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-paper-3 border border-rule text-muted">
            <Activity size={12} className="text-accent" aria-hidden="true" />
            <span>Sensors:</span>
            <span className="text-ink font-medium num">8/8 online</span>
          </div>

          {criticalCount + highCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-bad-soft border border-bad text-bad font-medium text-xs">
              <ShieldAlert size={13} aria-hidden="true" />
              <span className="num">{criticalCount + highCount}</span>
              <span className="hidden md:inline">active warnings</span>
            </div>
          )}

          <div className="h-4 w-px bg-rule hidden sm:block" />

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-1.5 rounded-md border border-rule bg-paper-2 hover:bg-paper-3 text-muted hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50"
            title="Refresh satellite & sensor telemetry"
            aria-label="Refresh telemetry"
          >
            <RefreshCw size={14} className={isSyncing ? 'motion-safe:animate-spin' : ''} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={runDemoStep}
            className="px-2.5 py-1 rounded-md bg-paper-3 hover:bg-paper border border-rule text-ink text-xs font-medium flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
            title="Advance deterministic simulation scenario"
          >
            <PlayCircle size={13} className="text-accent" aria-hidden="true" />
            <span className="hidden md:inline">
              {demoStep === 0 ? 'Run scenario' : `Step ${demoStep}/6`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="px-2.5 py-1 rounded-md border border-rule bg-paper-2 hover:bg-paper-3 text-xs font-medium text-ink flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-accent"
          >
            {authToken ? (
              <>
                <Unlock size={13} className="text-ok" aria-hidden="true" />
                <span className="hidden md:inline">{authUsername}</span>
              </>
            ) : (
              <>
                <Lock size={13} className="text-muted" aria-hidden="true" />
                <span className="hidden md:inline">Officer login</span>
              </>
            )}
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* 2. Active Alerts Banner Strip */}
      <AlertBanner alerts={alertItems} onSelectLocation={(id) => {
        const found = riskData.find((l) => l.location_id === id);
        if (found) setSelectedLocation(found);
      }} />

      {/* Dispatch feedback toast */}
      {dispatchStatus && (
        <div className="bg-paper-2 border-b border-accent px-4 py-2 text-xs text-accent flex items-center gap-2">
          <ShieldAlert size={14} className="shrink-0" aria-hidden="true" />
          <span>{dispatchStatus}</span>
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex border-b border-rule bg-paper-2 px-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2 text-xs font-medium border-b-2 text-center transition-colors ${
            activeTab === 'map' ? 'border-accent text-ink font-semibold' : 'border-transparent text-muted'
          }`}
        >
          Tactical map
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 text-xs font-medium border-b-2 text-center transition-colors ${
            activeTab === 'list' ? 'border-accent text-ink font-semibold' : 'border-transparent text-muted'
          }`}
        >
          Catchments ({riskData.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('intel')}
          className={`flex-1 py-2 text-xs font-medium border-b-2 text-center transition-colors ${
            activeTab === 'intel' ? 'border-accent text-ink font-semibold' : 'border-transparent text-muted'
          }`}
        >
          Basin details
        </button>
      </div>

      {/* 3. Main 3-Column Operations Layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Column: Catchment List (≈320px on desktop) */}
        <aside
          className={`col-span-12 lg:col-span-3 xl:col-span-3 border-r border-rule bg-paper-2 flex flex-col ${
            activeTab === 'list' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Search Bar with "/" keyboard shortcut indicator */}
          <div className="p-3 border-b border-rule bg-paper-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted pointer-events-none" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search basin name or ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-paper-3 border border-rule rounded-md text-ink placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                aria-label="Search catchment basins"
              />
              <kbd className="absolute right-2.5 top-2 text-[10px] text-muted bg-paper-2 px-1 rounded border border-rule pointer-events-none">
                /
              </kbd>
            </div>
          </div>

          {/* Region Filter Tabs */}
          <div className="p-2 border-b border-rule flex flex-wrap gap-1 bg-paper-2">
            {REGION_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveRegion(f.id)}
                className={`px-2 py-1 rounded text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  activeRegion === f.id
                    ? 'bg-paper-3 font-semibold text-ink border border-rule-2'
                    : 'text-muted hover:text-ink hover:bg-paper-3 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Catchment Basin List */}
          <div className="flex-1 overflow-y-auto divide-y divide-rule">
            {filteredLocations.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No matching basins"
                  description="Try adjusting your search terms or filter selection."
                  action={{
                    label: 'Clear search',
                    onClick: () => {
                      setSearchQuery('');
                      setActiveRegion('ALL');
                    },
                  }}
                />
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isSelected = selectedLocation?.location_id === loc.location_id;
                return (
                  <button
                    key={loc.location_id}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc);
                      setActiveTab('intel');
                    }}
                    className={`w-full text-left p-3 transition-colors flex items-start justify-between gap-2.5 focus-visible:outline-2 focus-visible:outline-accent ${
                      isSelected
                        ? 'bg-paper-3 border-l-2 border-l-accent'
                        : 'hover:bg-paper-3'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-ink truncate">
                          {loc.location_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="num">{loc.location_id}</span>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(loc.trajectory_trend)}
                          <span className="truncate">{loc.lead_time_window}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <RiskBadge level={loc.risk_level} size="sm" />
                      <span className="text-xs text-muted num font-medium">
                        {loc.flood_probability}%
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Center Column: Tactical Map & Supporting Telemetry */}
        <main
          className={`col-span-12 lg:col-span-5 xl:col-span-5 flex flex-col border-r border-rule bg-paper overflow-y-auto ${
            activeTab === 'map' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Tactical Map Container */}
          <div className="h-[480px] w-full relative bg-paper-2 border-b border-rule">
            {selectedLocation && selectedLocation.location_id.startsWith('DIGITAL-TWIN-') ? (
              <MapDigitalTwin
                locationId={selectedLocation.location_id}
                lat={selectedLocation.lat}
                lng={selectedLocation.lng}
                locationName={selectedLocation.location_name}
                riskLevel={selectedLocation.risk_level}
              />
            ) : (
              <MapWrapper locations={riskData} />
            )}

            {/* Tactical basemap legend overlay */}
            <div className="absolute top-3 left-3 z-[400] bg-paper-2/95 border border-rule p-2.5 rounded-md text-xs shadow-sm hidden sm:block">
              <div className="flex items-center gap-1.5 text-muted mb-1.5 font-medium">
                <Layers size={13} className="text-accent" aria-hidden="true" />
                <span>Basin risk status</span>
              </div>
              <div className="flex flex-col gap-1 text-ink-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-bad"></span>
                  <span>Critical ({criticalCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent"></span>
                  <span>High ({highCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cool"></span>
                  <span>Moderate ({riskData.filter((r) => r.risk_level === 'MODERATE').length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-ok"></span>
                  <span>Low ({riskData.filter((r) => r.risk_level === 'LOW').length})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Satellite Constellation & Agency Feed HUD */}
          <div className="p-4 border-b border-rule bg-paper">
            <SatelliteFeed onSync={handleManualSync} isSyncing={isSyncing} />
          </div>

          {/* Sub-system Telemetry Grids */}
          <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4 bg-paper">
            <SimulationPanel />
            <SensorPanel />
          </div>
        </main>

        {/* Right Column: Detailed Basin Intelligence & Decision Actions (≈380px) */}
        <aside
          className={`col-span-12 lg:col-span-4 xl:col-span-4 bg-paper-2 flex flex-col overflow-y-auto ${
            activeTab === 'intel' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {selectedLocation ? (
            <div className="p-4 space-y-4">
              {/* Basin Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-rule">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-semibold text-ink leading-tight">
                      {selectedLocation.location_name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="num">{selectedLocation.location_id}</span>
                    <span>·</span>
                    <SourceTag
                      isSimulated={selectedLocation.is_simulated}
                      sourceName={selectedLocation.data_source}
                    />
                  </div>
                </div>
                <RiskBadge level={selectedLocation.risk_level} size="md" />
              </div>

              {/* Key StatCards Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <StatCard
                  label="Flood probability"
                  value={selectedLocation.flood_probability}
                  unit="%"
                  change={selectedLocation.trajectory_trend.includes('INCREASING') ? 4.2 : -1.5}
                  changeLabel="surge"
                  sparklineData={selectedLocation.trajectory.map((t) => t.risk_probability)}
                  variant={selectedLocation.risk_level === 'CRITICAL' ? 'alert' : 'default'}
                />
                <StatCard
                  label="Landslide index"
                  value={selectedLocation.landslide_probability}
                  unit="%"
                  sparklineData={[30, 45, 52, 60, selectedLocation.landslide_probability]}
                />
                <StatCard
                  label="Model confidence"
                  value={selectedLocation.confidence}
                  unit="%"
                  updatedAgo="Calibrated"
                />
                <StatCard
                  label="Compound hazard"
                  value={selectedLocation.compound_hazard_level}
                  updatedAgo="Combined"
                />
              </div>

              {/* Satellite Signatures Grid */}
              {selectedLocation.satellite_info && (
                <div className="p-3 bg-paper-3 rounded-lg border border-rule space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted font-medium">
                    <span>Multi-satellite sensor signatures</span>
                    <span className="num">4 feeds</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between text-muted">
                      <span>INSAT-3DR CCT:</span>
                      <span className="text-ink font-medium num">
                        {selectedLocation.satellite_info.isro_insat_cct}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>NASA GPM flux:</span>
                      <span className="text-ink font-medium num">
                        {selectedLocation.satellite_info.nasa_gpm_flux} mm/h
                      </span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Sentinel-1 soil:</span>
                      <span className="text-ink font-medium num">
                        {selectedLocation.satellite_info.sentinel_soil_idx} dB σ°
                      </span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>IMD radar:</span>
                      <span className="text-ink font-medium num">
                        {selectedLocation.satellite_info.imd_radar_dbz} dBZ
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 24-Hour Risk Trajectory Chart */}
              <div className="p-3.5 bg-paper rounded-lg border border-rule">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-medium text-ink">Risk trajectory forecast</span>
                  <span className="text-muted text-xs">
                    Trend: <span className="text-ink">{selectedLocation.trajectory_trend}</span>
                  </span>
                </div>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedLocation.trajectory} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="var(--color-rule)" vertical={false} />
                      <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-muted)' }} />
                      <Tooltip content={<CustomTrajectoryTooltip />} />
                      <ReferenceLine y={75} stroke="var(--color-bad)" strokeDasharray="3 3" />
                      <ReferenceLine y={50} stroke="var(--color-accent)" strokeDasharray="3 3" />
                      <Line
                        type="monotone"
                        dataKey="risk_probability"
                        stroke={
                          selectedLocation.risk_level === 'CRITICAL'
                            ? 'var(--color-bad)'
                            : selectedLocation.risk_level === 'HIGH'
                            ? 'var(--color-accent)'
                            : 'var(--color-ok)'
                        }
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hydrological Feature Attribution (SHAP Factors) */}
              {(Object.keys(selectedLocation.contributing_factors).length > 0 ||
                Object.keys(selectedLocation.negative_factors || {}).length > 0) && (
                <div className="p-3 bg-paper rounded-lg border border-rule space-y-2">
                  <span className="text-xs font-medium text-ink block">
                    Feature attribution (hydrological risk drivers)
                  </span>
                  <div className="space-y-1.5">
                    {Object.entries(selectedLocation.contributing_factors).map(([factor, weight]) => (
                      <div key={factor}>
                        <div className="flex justify-between text-xs text-ink-2 mb-0.5">
                          <span>{factor}</span>
                          <span className="text-bad num font-medium">
                            +{Math.round(weight * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-paper-3 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-bad h-full"
                            style={{ width: `${Math.min(100, weight * 100 * 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    {Object.entries(selectedLocation.negative_factors || {}).map(([factor, weight]) => (
                      <div key={factor}>
                        <div className="flex justify-between text-xs text-muted mb-0.5">
                          <span>{factor} (buffer factor)</span>
                          <span className="text-ok num font-medium">
                            -{Math.round(weight * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-paper-3 rounded-full h-1 overflow-hidden">
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

              {/* Action Directive & Safe Zone Shelter */}
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  selectedLocation.risk_level === 'CRITICAL' || selectedLocation.risk_level === 'HIGH'
                    ? 'bg-bad-soft border-bad text-ink'
                    : 'bg-paper-3 border-rule text-ink'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {selectedLocation.risk_level === 'CRITICAL' || selectedLocation.risk_level === 'HIGH' ? (
                    <ShieldAlert size={15} className="text-bad shrink-0" aria-hidden="true" />
                  ) : (
                    <ShieldCheck size={15} className="text-ok shrink-0" aria-hidden="true" />
                  )}
                  <span>Operational directive:</span>
                </div>
                <p className="leading-snug">{selectedLocation.recommended_action}</p>
                <div className="pt-1.5 border-t border-rule text-xs flex items-center justify-between">
                  <span className="text-muted">Safe zone evacuation destination:</span>
                  <span className="font-medium text-ok">{selectedLocation.safe_zone}</span>
                </div>
              </div>

              {/* Official Action Controls */}
              <div className="space-y-2 pt-2 border-t border-rule">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDispatchAlert(selectedLocation.location_id)}
                    className="py-2 px-3 rounded-md bg-paper-3 hover:bg-paper border border-rule text-ink text-xs font-medium flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
                  >
                    <ShieldAlert size={13} className="text-accent" aria-hidden="true" />
                    <span>Dispatch alert</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const dtId = `DIGITAL-TWIN-${selectedLocation.location_id}`;
                      setSelectedLocation({ ...selectedLocation, location_id: dtId });
                    }}
                    className="py-2 px-3 rounded-md bg-paper-3 hover:bg-paper border border-rule text-ink text-xs font-medium flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
                  >
                    <Navigation size={13} className="text-cool" aria-hidden="true" />
                    <span>Digital twin view</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a
                    href={`${API_BASE_URL}/api/cap-alert/${selectedLocation.location_id.replace('DIGITAL-TWIN-', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-paper-3 hover:bg-paper text-muted hover:text-ink rounded border border-rule transition-colors focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <FileCode2 size={12} className="text-accent" aria-hidden="true" />
                    <span>OASIS CAP 1.2 XML</span>
                  </a>

                  <a
                    href={`${API_BASE_URL}/api/bulletin/${selectedLocation.location_id.replace('DIGITAL-TWIN-', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-paper-3 hover:bg-paper text-muted hover:text-ink rounded border border-rule transition-colors focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <FileText size={12} className="text-cool" aria-hidden="true" />
                    <span>Plain bulletin</span>
                  </a>
                </div>
              </div>

              {/* Persistent Disclaimer Bar */}
              <DisclaimerBar />
            </div>
          ) : (
            <div className="p-8">
              <EmptyState
                title="No basin selected"
                description="Select a catchment basin from the left panel or tactical map to inspect real-time hydrological risk."
              />
            </div>
          )}
        </aside>
      </div>

      {/* Operator Login Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-paper-2 border border-rule rounded-lg max-w-sm w-full p-5 relative shadow-lg">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Close authentication modal"
            >
              <X size={16} aria-hidden="true" />
            </button>

            <h3 className="text-sm font-semibold text-ink mb-1 flex items-center gap-2">
              <Lock size={15} className="text-accent" aria-hidden="true" /> Operator authentication
            </h3>
            <p className="text-xs text-muted mb-4">
              Enter authorized personnel credentials to authorize emergency alert dispatching.
            </p>

            <form onSubmit={handleOperatorLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Duty officer ID</label>
                <input
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="w-full p-2 bg-paper-3 border border-rule rounded text-xs text-ink focus:outline-none focus:border-accent transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Secret key</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full p-2 bg-paper-3 border border-rule rounded text-xs text-ink focus:outline-none focus:border-accent transition-colors"
                  required
                />
              </div>

              {loginError && <p className="text-xs text-bad">{loginError}</p>}

              <button
                type="submit"
                className="w-full py-2 bg-paper-3 hover:bg-paper border border-rule text-ink rounded text-xs font-medium transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent"
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
