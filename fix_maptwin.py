import re

with open('frontend/src/components/MapDigitalTwin.tsx', 'r') as f:
    content = f.read()

# Add Historical Data Comparison and SubCity zones state and fetching
new_imports = "import { AlertCircle, X, Navigation, RefreshCw, Layers, Clock, TrendingUp } from 'lucide-react';\nimport axios from 'axios';"

content = content.replace("import { AlertCircle, X, Navigation, RefreshCw } from 'lucide-react';", new_imports)

# State additions inside MapDigitalTwin component
state_additions = """
  const [activeTab, setActiveTab] = useState<'MAP' | 'DEEP_DIVE'>('MAP');
  const [subZones, setSubZones] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'DEEP_DIVE') {
        axios.get(`${API_BASE_URL}/api/subcity_zones/${locationId}`)
            .then(res => setSubZones(res.data.zones))
            .catch(err => console.error("Error fetching sub-zones", err));
            
        axios.get(`${API_BASE_URL}/api/historical_compare/${locationId}`)
            .then(res => setHistoricalData(res.data))
            .catch(err => console.error("Error fetching historical data", err));
    }
  }, [activeTab, locationId]);
"""

content = re.sub(r'const MapDigitalTwin: React\.FC<MapDigitalTwinProps> = \(\{ locationId, lat, lng, locationName, riskLevel \}\) => \{', 'const MapDigitalTwin: React.FC<MapDigitalTwinProps> = ({ locationId, lat, lng, locationName, riskLevel }) => {' + state_additions, content)

# Header modifications for Tabs
old_header = """      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Navigation size={18} className="text-cyan-400" /> 
            Live Risk Perimeter: {locationName}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-1">LAT: {lat} | LNG: {lng} | ISRO Bhuvan Sync</p>
        </div>
        <div className={`px-3 py-1 rounded border font-bold text-xs uppercase tracking-widest ${
          riskLevel === 'CRITICAL' ? 'bg-red-900/50 text-red-400 border-red-500' :
          riskLevel === 'HIGH' ? 'bg-orange-900/50 text-orange-400 border-orange-500' :
          riskLevel === 'MODERATE' ? 'bg-yellow-900/50 text-yellow-400 border-yellow-500' :
          'bg-cyan-900/50 text-cyan-400 border-cyan-500'
        }`}>
          {riskLevel} ZONE
        </div>
      </div>"""

new_header = """      <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Navigation size={18} className="text-cyan-400" /> 
            Live Risk Perimeter: {locationName}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-1">LAT: {lat} | LNG: {lng} | ISRO Bhuvan Sync</p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setActiveTab('MAP')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'MAP' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    DIGITAL TWIN
                </button>
                <button 
                    onClick={() => setActiveTab('DEEP_DIVE')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'DEEP_DIVE' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Layers size={12} /> CITY DEEP DIVE
                </button>
            </div>
            
            <div className={`px-3 py-1 rounded border font-bold text-xs uppercase tracking-widest ${
              riskLevel === 'CRITICAL' ? 'bg-red-900/50 text-red-400 border-red-500' :
              riskLevel === 'HIGH' ? 'bg-orange-900/50 text-orange-400 border-orange-500' :
              riskLevel === 'MODERATE' ? 'bg-yellow-900/50 text-yellow-400 border-yellow-500' :
              'bg-cyan-900/50 text-cyan-400 border-cyan-500'
            }`}>
              {riskLevel} ZONE
            </div>
        </div>
      </div>
      
      {activeTab === 'DEEP_DIVE' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2"><Layers size={16}/> Sub-City Micro Grids (2km Radius)</h4>
                {subZones.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {subZones.map((z, i) => (
                            <div key={i} className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                <div className="text-xs font-bold text-slate-300">{z.name}</div>
                                <div className={`text-[10px] mt-1 font-mono ${z.risk_multiplier > 1.0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    Risk Multiplier: {z.risk_multiplier.toFixed(2)}x
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-slate-400 flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Analyzing terrain...</div>
                )}
            </div>
            
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2"><Clock size={16}/> 5-Year Historical Baseline (Today)</h4>
                {historicalData ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-700">
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest">Rainfall vs 5Yr Avg</div>
                                <div className="text-lg font-bold text-white">{historicalData.today_rainfall_mm} <span className="text-xs text-slate-500 font-normal">mm</span> <span className="text-xs mx-1 text-slate-600">vs</span> {historicalData.avg_5_year_rainfall_mm} <span className="text-xs text-slate-500 font-normal">mm</span></div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-700">
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest">Risk Trend</div>
                                <div className={`text-sm font-bold mt-1 ${historicalData.historical_risk_trend.includes('HIGHER') ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {historicalData.historical_risk_trend.replace(/_/g, ' ')}
                                </div>
                            </div>
                            <TrendingUp size={24} className={historicalData.historical_risk_trend.includes('HIGHER') ? 'text-red-500' : 'text-emerald-500'} />
                        </div>
                    </div>
                ) : (
                     <div className="text-xs text-slate-400 flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Fetching climate records...</div>
                )}
            </div>
        </div>
      ) : ("""

content = content.replace(old_header, new_header)

# Close the parenthesis for the activeTab ternary
content = content.replace("</div>\n  );\n};\n\nexport { MapDigitalTwin };", "</div>\n      )}\n    </div>\n  );\n};\n\nexport { MapDigitalTwin };")

with open('frontend/src/components/MapDigitalTwin.tsx', 'w') as f:
    f.write(content)
