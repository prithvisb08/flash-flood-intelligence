import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Power, PowerOff, BatteryFull, BatteryMedium, BatteryLow } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { type SensorStatus, SensorStatusSchema } from '../schemas';
import { z } from 'zod';

export default function SensorPanel() {
  const [sensors, setSensors] = useState<SensorStatus[]>([]);

  const fetchSensors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sensors`);
      const parsed = z.array(SensorStatusSchema).safeParse(res.data);
      if (parsed.success) {
        setSensors(parsed.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSensors();
    const interval = setInterval(fetchSensors, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleSensor = async (id: string) => {
    try {
      await axios.post(`${API_BASE_URL}/api/sensors/toggle?sensor_id=${id}`);
      fetchSensors();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-paper-2 border border-rule rounded-lg p-4">
      <h3 className="text-ink font-medium mb-4 flex items-center gap-2">
        <Activity size={18} className="text-accent" /> Ground sensor telemetry
      </h3>
      <div className="space-y-3">
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            className={`p-3 rounded-md border flex items-center justify-between ${
              sensor.online ? 'bg-paper-3 border-rule' : 'bg-bad-soft border-bad text-bad'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sensor.online ? 'bg-ok motion-safe:animate-pulse' : 'bg-bad'
                  }`}
                />
                <span className="font-medium text-sm text-ink">{sensor.id}</span>
                <span className="text-xs text-muted">{sensor.type}</span>
              </div>
              <div className="text-xs text-muted mt-1 flex gap-3">
                <span>
                  Reading:{' '}
                  {sensor.online ? (
                    <span className="text-cool font-medium num">{sensor.reading}</span>
                  ) : (
                    <span className="text-bad">offline</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  {sensor.battery > 80 ? (
                    <BatteryFull size={12} className="text-ok" />
                  ) : sensor.battery > 30 ? (
                    <BatteryMedium size={12} className="text-accent" />
                  ) : (
                    <BatteryLow size={12} className="text-bad" />
                  )}
                  <span className="num">{sensor.battery}%</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleSensor(sensor.id)}
              className={`p-2 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                sensor.online
                  ? 'bg-paper border border-rule hover:bg-bad-soft text-muted hover:text-bad'
                  : 'bg-bad border border-bad text-ink hover:bg-ok-soft'
              }`}
              title="Toggle sensor power state"
              aria-label={`Toggle power for sensor ${sensor.id}`}
            >
              {sensor.online ? <Power size={16} /> : <PowerOff size={16} />}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted">
        Diagnostic: toggle power to observe model confidence adjustment on hardware degradation.
      </div>
    </div>
  );
}
