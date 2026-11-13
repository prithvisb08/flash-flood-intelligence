import { useState, useEffect } from 'react';
import axios from 'axios';
import { Satellite, RefreshCw, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { type SatelliteFeedItem, SatelliteFeedItemSchema } from '../schemas';
import { z } from 'zod';

interface SatelliteFeedProps {
  onSync?: () => void;
  isSyncing?: boolean;
}

export default function SatelliteFeed({ onSync, isSyncing }: SatelliteFeedProps) {
  const [feed, setFeed] = useState<SatelliteFeedItem[]>([]);

  const fetchFeed = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/satellite-feed`);
      const parsed = z.array(SatelliteFeedItemSchema).safeParse(res.data);
      if (parsed.success) {
        setFeed(parsed.data);
      }
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
    <div className="bg-paper-2 border border-rule rounded-xl p-4 md:p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-rule pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-paper-3 border border-rule rounded-lg text-accent">
            <Satellite size={18} />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-medium text-ink flex items-center gap-2">
              Earth observation telemetry grid
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-ok-soft text-ok border border-ok">
                <span className="w-1.5 h-1.5 rounded-full bg-ok" /> Live agency link
              </span>
            </h3>
            <p className="text-xs text-muted">
              Direct telemetry feeds from ISRO MOSDAC, NASA GPM, Copernicus Sentinel-1, and IMD DWR
            </p>
          </div>
        </div>

        {onSync && (
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-accent text-accent-ink hover:opacity-90 disabled:opacity-50 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent"
          >
            <RefreshCw size={13} className={isSyncing ? 'motion-safe:animate-spin' : ''} />
            {isSyncing ? 'Synchronizing feeds…' : 'Sync satellite telemetry'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {feed.map((sat, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-lg border border-rule bg-paper-3 transition-colors hover:border-rule-2"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs px-2 py-0.5 rounded bg-paper border border-rule text-muted">
                {sat.agency}
              </span>
              <span className="text-xs text-ok flex items-center gap-1">
                <CheckCircle2 size={11} /> <span className="num">{sat.latency_ms} ms</span>
              </span>
            </div>

            <div className="font-medium text-ink text-xs md:text-sm mb-1">{sat.satellite}</div>
            <div className="text-xs text-muted mb-2 truncate">{sat.sensor_type}</div>

            <div className="space-y-1 text-xs border-t border-rule pt-2 text-ink-2">
              <div className="flex justify-between">
                <span className="text-muted">Resolution:</span>
                <span className="font-medium text-cool num">{sat.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Stream:</span>
                <span className="text-ink truncate max-w-[130px]">{sat.data_stream}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
