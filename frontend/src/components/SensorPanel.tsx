import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Power, PowerOff, BatteryFull, BatteryMedium, BatteryLow } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Sensor {
  id: string;
  type: string;
  reading: string;
  battery: number;
  online: boolean;
  last_updated: string;
}

export default function SensorPanel() {
  const [sensors, setSensors] = useState<Sensor[]>([]);

  const fetchSensors = async () => {
    try {
      const res = await axios.get<Sensor[]>(`${API_BASE_URL}/api/sensors`);
      setSensors(res.data);
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
      fetchSensors(); // Refresh instantly
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <Activity size={18} /> IoT Sensor Network
      </h3>
      <div className="space-y-3">
        {sensors.map((sensor) => (
          <div key={sensor.id} className={`p-3 rounded-md border flex items-center justify-between ${sensor.online ? 'bg-slate-900 border-slate-700' : 'bg-red-950/20 border-red-900/50 opacity-75'}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${sensor.online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="font-bold text-sm text-slate-200">{sensor.id}</span>
                <span className="text-[10px] uppercase text-slate-500">{sensor.type}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex gap-3">
                <span>Reading: {sensor.online ? <span className="text-blue-400 font-bold">{sensor.reading}</span> : <span className="text-red-400">N/A</span>}</span>
                <span className="flex items-center gap-1">
                  {sensor.battery > 80 ? <BatteryFull size={12} className="text-emerald-500"/> : sensor.battery > 30 ? <BatteryMedium size={12} className="text-yellow-500"/> : <BatteryLow size={12} className="text-red-500"/>}
                  {sensor.battery}%
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => toggleSensor(sensor.id)}
              className={`p-2 rounded-md transition-colors ${sensor.online ? 'bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400' : 'bg-red-900/50 hover:bg-emerald-900/50 text-red-400 hover:text-emerald-400'}`}
              title="Simulate Sensor Failure"
            >
              {sensor.online ? <Power size={16} /> : <PowerOff size={16} />}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-slate-500">
        Demo Action: Toggle power to simulate connection failure and observe confidence drop in the ML model.
      </div>
    </div>
  );
}
