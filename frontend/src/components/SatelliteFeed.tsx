import { useState, useEffect } from 'react';
import axios from 'axios';
import { Satellite, RefreshCw, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface SatelliteFeedItem {
  constellation: string;
  satellite: string;
  agency: string;
  sensor_type: string;
  coverage: string;
  status: string;
  latency_ms: number;
  resolution: string;
  data_stream: string;
  last_ping: string;
}

interface SatelliteFeedProps {
  onSync?: () => void;
  isSyncing?: boolean;
}

export default function SatelliteFeed({ onSync, isSyncing }: SatelliteFeedProps) {
  const [feed, setFeed] = useState<SatelliteFeedItem[]>([]);

  const fetchFeed = async () => {
    try {
      const res = await axios.get<SatelliteFeedItem[]>(`${API_BASE_URL}/api/satellite-feed`);
      setFeed(res.data);
    } catch (err) {
      console.error('Failed to fetch satellite feed:', err);
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Satellite size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              Multi-Satellite Earth Observation Grid
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> LIVE 4-AGENCY LINK
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Direct telemetry feeds from ISRO MOSDAC, NASA GPM IMERG, Copernicus Sentinel-1 & IMD DWR
            </p>
          </div>
        </div>

        {onSync && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/40 transition-all active:scale-95"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Synchronizing Feeds...' : 'Force Multi-Satellite Sync'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {feed.map((sat, idx) => {
          const isISRO = sat.agency.includes('ISRO');
          const isNASA = sat.agency.includes('NASA');
          const isESA = sat.agency.includes('ESA');

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all duration-300 ${
                isISRO
                  ? 'bg-orange-950/20 border-orange-700/40 hover:border-orange-500/60'
                  : isNASA
                  ? 'bg-blue-950/20 border-blue-700/40 hover:border-blue-500/60'
                  : isESA
                  ? 'bg-cyan-950/20 border-cyan-700/40 hover:border-cyan-500/60'
                  : 'bg-emerald-950/20 border-emerald-700/40 hover:border-emerald-500/60'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    isISRO
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : isNASA
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : isESA
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {sat.agency}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={11} /> {sat.latency_ms}ms
                </span>
              </div>

              <div className="font-black text-white text-xs md:text-sm mb-1">{sat.satellite}</div>
              <div className="text-[10px] text-slate-400 font-mono mb-2 line-clamp-1">{sat.sensor_type}</div>

              <div className="space-y-1 text-[10px] border-t border-slate-800/80 pt-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolution:</span>
                  <span className="font-mono font-bold text-cyan-300">{sat.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stream:</span>
                  <span className="font-medium text-slate-200 truncate max-w-[130px]">{sat.data_stream}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
