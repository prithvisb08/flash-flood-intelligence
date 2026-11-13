import { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, Navigation, AlertCircle, ArrowLeft, MapPin, CheckCircle2, Globe, Satellite, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, WS_BASE_URL } from '../config';

interface SatelliteSourceInfo {
  isro_insat_cct: number;
  nasa_gpm_flux: number;
  sentinel_soil_idx: number;
  imd_radar_dbz: number;
}

interface RiskData {
  location_id: string;
  location_name: string;
  risk_level: string;
  recommended_action: string;
  safe_zone: string;
  flood_probability: number;
  landslide_probability: number;
  satellite_info?: SatelliteSourceInfo;
}

const TRANSLATIONS = {
  en: {
    back: "Back to Portal",
    title: "JALRAKSHAK Public Safety",
    subtitle: "Hyper-local early warning & safe zone routing powered by ISRO & NASA telemetry",
    selectRegion: "Select Your Village / Valley / Ward:",
    liveAdvisory: "Live Multi-Satellite Advisory",
    risk: "RISK",
    flashFlood: "Flash Flood Probability",
    landslide: "Landslide Hazard",
    actionReq: "Action Required:",
    avoidStreams: "Avoid streams, culverts, and low-lying footpaths.",
    secureKits: "Secure emergency kits (drinking water, medicines, torch).",
    moveUphill: "Move immediately uphill towards the designated safe shelter.",
    shelter: "Designated Emergency Shelter (Safe Zone)",
    verifiedZone: "ISRO & NDMA Verified Geotagged Safe Zone",
    evacDist: "Evacuation Distance",
    normalAction: "Normal operations. Continuous multi-satellite monitoring active.",
    advisoryAction: "Advisory: Clear local drainage channels, alert local emergency responders.",
    warningAction: "Warning: High risk of flash flood/mudslide. Prepare for immediate evacuation.",
    emergencyAction: "EMERGENCY: Immediate evacuation to designated safe zones required. Flash flood imminent!",
    syncButton: "Sync Live Weather Data",
    syncing: "Synchronizing...",
    satelliteVerified: "Verified by ISRO INSAT-3DR & NASA GPM Feeds"
  },
  hi: {
    back: "पोर्टल पर वापस जाएँ",
    title: "जल-रक्षक जन सुरक्षा",
    subtitle: "इसरो (ISRO) और नासा (NASA) उपग्रह डेटा द्वारा संचालित अति-स्थानीय पूर्व चेतावनी",
    selectRegion: "अपना गांव / घाटी / वार्ड चुनें:",
    liveAdvisory: "लाइव उपग्रह चेतावनी स्थिति",
    risk: "खतरा",
    flashFlood: "अचानक बाढ़ की संभावना (Flash Flood)",
    landslide: "भूस्खलन का जोखिम (Landslide)",
    actionReq: "आवश्यक कार्रवाई:",
    avoidStreams: "नदी-नालों और निचले रास्तों से तुरंत दूर रहें।",
    secureKits: "आपातकालीन किट (पानी, दवाएं, टॉर्च) तैयार रखें।",
    moveUphill: "तुरंत ऊंचाई वाले सुरक्षित आश्रय की ओर बढ़ें।",
    shelter: "निर्धारित आपातकालीन आश्रय (सुरक्षित क्षेत्र)",
    verifiedZone: "इसरो व आपदा प्रबंधन द्वारा सत्यापित सुरक्षित क्षेत्र",
    evacDist: "निकासी दूरी",
    normalAction: "सामान्य स्थिति। उपग्रह द्वारा मौसम की निरंतर निगरानी जारी है।",
    advisoryAction: "सलाह: जल निकासी साफ़ करें, स्थानीय आपदा टीमों को सतर्क करें।",
    warningAction: "चेतावनी: बाढ़/भूस्खलन का उच्च जोखिम। तत्काल निकासी के लिए तैयार रहें।",
    emergencyAction: "आपातकाल: तुरंत सुरक्षित क्षेत्रों में निकासी अनिवार्य है!",
    syncButton: "लाइव मौसम डेटा अपडेट करें",
    syncing: "अपडेट हो रहा है...",
    satelliteVerified: "ISRO INSAT-3DR एवं NASA GPM उपग्रह द्वारा सत्यापित"
  }
};

export default function Citizen() {
  const [locations, setLocations] = useState<RiskData[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<string>("UK-001");
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchRiskData = async () => {
    try {
      const res = await axios.get<RiskData[]>(`${API_BASE_URL}/api/risk`);
      setLocations(res.data);
    } catch (err) {
      console.error('Error fetching risk data:', err);
    }
  };

  useEffect(() => {
    fetchRiskData();

    // WebSocket link for zero-latency live updates
    const ws = new WebSocket(`${WS_BASE_URL}/api/ws/telemetry`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLocations(data);
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await axios.post(`${API_BASE_URL}/api/sync`);
      await fetchRiskData();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const activeLoc = locations.find(l => l.location_id === selectedLoc) || locations[0];
  const t = TRANSLATIONS[lang];

  const getTranslatedAction = (actionEn: string, level: string) => {
    if (lang === 'en') return actionEn;
    if (level === 'LOW') return t.normalAction;
    if (level === 'MODERATE') return t.advisoryAction;
    if (level === 'HIGH') return t.warningAction;
    return t.emergencyAction;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <header className="flex justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-4 flex-col md:flex-row gap-4">
          <div>
            <Link to="/" className="text-emerald-400 font-bold flex items-center gap-2 mb-2 hover:underline text-xs uppercase tracking-wider">
              <ArrowLeft size={14} /> {t.back}
            </Link>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Shield className="text-emerald-400" /> {t.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-400">{t.subtitle}</p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <div className="hidden md:flex px-4 py-1.5 bg-blue-950/40 rounded-lg border border-blue-900/50 flex-col justify-center shadow-[0_0_10px_rgba(59,130,246,0.1)] mr-2">
              <span className="block text-[15px] font-black text-blue-400 leading-tight">1078 / 112</span>
              <span className="text-[9px] text-blue-400/80 uppercase tracking-widest font-bold">24x7 Helpline</span>
            </div>
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors text-xs font-bold text-cyan-300"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
              {isSyncing ? t.syncing : t.syncButton}
            </button>

            <button 
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-cyan-700 hover:from-emerald-600 hover:to-cyan-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition-all"
            >
              <Globe size={14} />
              {lang === 'en' ? 'हिंदी में पढ़ें' : 'Read in English'}
            </button>
          </div>
        </header>

        <div className="space-y-6">
          {/* Location Selector */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <MapPin size={14} className="text-cyan-400" /> {t.selectRegion}
            </label>
            <select 
              className="w-full p-3.5 border border-slate-700 rounded-xl bg-slate-950 text-slate-100 text-sm md:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
            >
              <optgroup label="Uttarakhand (Himalayas)">
                {locations.filter(l => l.location_id.startsWith('UK-')).map(loc => (
                  <option key={loc.location_id} value={loc.location_id}>{loc.location_name}</option>
                ))}
              </optgroup>
              <optgroup label="Himachal Pradesh (Western Himalayas)">
                {locations.filter(l => l.location_id.startsWith('HP-')).map(loc => (
                  <option key={loc.location_id} value={loc.location_id}>{loc.location_name}</option>
                ))}
              </optgroup>
              <optgroup label="Northeast India">
                {locations.filter(l => l.location_id.startsWith('NE-')).map(loc => (
                  <option key={loc.location_id} value={loc.location_id}>{loc.location_name}</option>
                ))}
              </optgroup>
              <optgroup label="Western Ghats & Southern Hills">
                {locations.filter(l => l.location_id.startsWith('WG-')).map(loc => (
                  <option key={loc.location_id} value={loc.location_id}>{loc.location_name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Active Location Status */}
          {activeLoc && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className={`p-6 md:p-8 rounded-3xl border text-center transition-all ${
                activeLoc.risk_level === 'CRITICAL' ? 'bg-red-950/40 border-red-500 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.2)]' :
                activeLoc.risk_level === 'HIGH' ? 'bg-orange-950/40 border-orange-500 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.15)]' :
                activeLoc.risk_level === 'MODERATE' ? 'bg-yellow-950/40 border-yellow-500 text-yellow-200' :
                'bg-emerald-950/30 border-emerald-500/80 text-emerald-200'
              }`}>
                <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest font-black opacity-80 mb-1">
                  <Satellite size={14} className="text-cyan-400" /> {t.liveAdvisory}
                </div>
                
                <div className="text-3xl md:text-5xl font-black mb-2 tracking-tight">
                  {activeLoc.risk_level} {t.risk}
                </div>
                <div className="text-sm font-semibold text-slate-300 mb-4">
                  {activeLoc.location_name}
                </div>

                {activeLoc.satellite_info && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900/90 rounded-full border border-slate-800 text-[10px] font-mono text-cyan-300 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    {t.satelliteVerified}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
                  <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{t.flashFlood}</div>
                    <div className="text-xl font-black text-cyan-400">{activeLoc.flood_probability}%</div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{t.landslide}</div>
                    <div className="text-xl font-black text-amber-400">{activeLoc.landslide_probability}%</div>
                  </div>
                </div>
                
                <div className="p-5 bg-slate-900/90 rounded-2xl text-left max-w-lg w-full mx-auto border border-slate-800">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-2">
                    <AlertCircle size={17} className="text-amber-400" /> {t.actionReq}
                  </h3>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed">
                    {getTranslatedAction(activeLoc.recommended_action, activeLoc.risk_level)}
                  </p>
                  
                  {(activeLoc.risk_level === 'CRITICAL' || activeLoc.risk_level === 'HIGH') && (
                    <ul className="mt-3.5 list-disc pl-5 space-y-1 text-xs text-red-300/90 font-medium">
                      <li>{t.avoidStreams}</li>
                      <li>{t.secureKits}</li>
                      <li>{t.moveUphill}</li>
                    </ul>
                  )}
                </div>
              </div>

              {/* Safe Zone Card */}
              <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
                <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
                  <Navigation className="text-emerald-400" size={18} /> {t.shelter}
                </h3>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-950 rounded-xl border border-slate-800 gap-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" /> {t.verifiedZone}
                    </div>
                    <div className="text-lg font-bold text-white">{activeLoc.safe_zone}</div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t.evacDist}</div>
                    <div className="text-lg font-black text-emerald-400 font-mono">~1.2 - 2.5 km</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
