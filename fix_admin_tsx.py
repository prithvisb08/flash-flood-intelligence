import re

with open('frontend/src/pages/Admin.tsx', 'r') as f:
    content = f.read()

# Add Official Bulletin function
new_func = """
  const generateBulletin = (locId: string) => {
    window.open(`${API_BASE_URL}/api/bulletin/${locId}`, '_blank');
  };
"""
content = re.sub(r'const handleOpenDigitalTwin = \(loc: RiskData\) => \{', new_func + '\n  const handleOpenDigitalTwin = (loc: RiskData) => {', content)

# Add Bulletin Button and 24x7 Helpline to location cards
# Find the mapping of filteredLocations
old_map = """                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenDigitalTwin(loc)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <Navigation size={12} /> Open Digital Twin
                    </button>
                  </div>"""

new_map = """                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => handleOpenDigitalTwin(loc)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <Navigation size={12} /> Open Digital Twin
                    </button>
                  </div>
                  
                  {loc.risk_level === 'CRITICAL' || loc.risk_level === 'HIGH' ? (
                    <div className="mt-3 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={14} className="text-red-500" />
                            <span className="text-xs font-bold text-red-400">ACTION DIRECTIVE</span>
                        </div>
                        <p className="text-[11px] text-red-200 mb-2">{loc.recommended_action}</p>
                        <p className="text-[11px] text-red-200/70 mb-3"><span className="font-bold">Evacuate to:</span> {loc.safe_zone}</p>
                        
                        <div className="flex gap-2">
                            <button onClick={() => generateBulletin(loc.location_id)} className="flex-1 py-1.5 bg-red-900/50 hover:bg-red-800/80 rounded border border-red-700 text-[10px] text-white font-bold tracking-wider transition-colors">
                                GENERATE NDMA BULLETIN (.TXT)
                            </button>
                        </div>
                    </div>
                  ) : null}
                  """

content = content.replace(old_map, new_map)

# Add 24x7 Helpline to Header
old_header = """          <div className="flex-1 md:flex-none px-3.5 py-2 bg-slate-900 rounded-xl border border-slate-800 text-center flex flex-col justify-center min-w-[95px]">
            <span className={`block text-xl font-black ${criticalLocations.length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
              {criticalLocations.length}
            </span>
            <span className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">Severe Warnings</span>
          </div>
        </div>
      </header>"""

new_header = """          <div className="flex-1 md:flex-none px-3.5 py-2 bg-slate-900 rounded-xl border border-slate-800 text-center flex flex-col justify-center min-w-[95px]">
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
      </header>"""

content = content.replace(old_header, new_header)

with open('frontend/src/pages/Admin.tsx', 'w') as f:
    f.write(content)
