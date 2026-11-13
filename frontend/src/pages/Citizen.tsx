import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Shield,
  Navigation,
  AlertCircle,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Globe,
  Satellite,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, WS_BASE_URL } from '../config';
import { type PredictionResult, PredictionResultSchema } from '../schemas';
import { z } from 'zod';

const TRANSLATIONS = {
  en: {
    back: 'Back to portal',
    title: 'JALRAKSHAK public safety',
    subtitle: 'Hyper-local early warning and evacuation shelter guidance',
    selectRegion: 'Select mountain basin or district:',
    liveAdvisory: 'Live telemetry advisory',
    risk: 'risk tier',
    flashFlood: 'Flash flood probability',
    landslide: 'Landslide hazard index',
    actionReq: 'Action directive:',
    avoidStreams: 'Avoid mountain streams, culverts, and low-lying footpaths.',
    secureKits: 'Keep emergency supplies, torch, and clean water ready.',
    moveUphill: 'Move uphill towards designated safe grounds if warning escalates.',
    shelter: 'Designated emergency safe shelter',
    verifiedZone: 'Verified high-ground evacuation shelter',
    evacDist: 'Estimated distance',
    normalAction: 'Normal baseline operations. Continuous telemetry active.',
    advisoryAction: 'Advisory: Clear local drainage channels and alert response volunteers.',
    warningAction: 'Warning: High risk of sudden surge. Prepare for immediate evacuation.',
    emergencyAction: 'EMERGENCY: Immediate evacuation to safe zones required. Flash flood imminent!',
    syncButton: 'Sync telemetry',
    syncing: 'Syncing…',
    helpline: '24x7 NDRF Helpline: 1078 / 112',
  },
  hi: {
    back: 'पोर्टल पर वापस जाएँ',
    title: 'जल-रक्षक जन सुरक्षा',
    subtitle: 'अति-स्थानीय पूर्व चेतावनी एवं सुरक्षित आश्रय निर्देश',
    selectRegion: 'अपना पर्वतीय क्षेत्र या जिला चुनें:',
    liveAdvisory: 'लाइव उपग्रह चेतावनी स्थिति',
    risk: 'खतरा स्तर',
    flashFlood: 'अचानक बाढ़ की संभावना',
    landslide: 'भूस्खलन का जोखिम',
    actionReq: 'आवश्यक निर्देश:',
    avoidStreams: 'नदी-नालों और निचले रास्तों से तुरंत दूर रहें।',
    secureKits: 'आपातकालीन सामग्री व टॉर्च तैयार रखें।',
    moveUphill: 'चेतावनी बढ़ने पर तुरंत निर्धारित ऊंचे आश्रय की ओर बढ़ें।',
    shelter: 'निर्धारित सुरक्षित आश्रय स्थल',
    verifiedZone: 'सत्यापित सुरक्षित आश्रय क्षेत्र',
    evacDist: 'अनुमानित दूरी',
    normalAction: 'सामान्य स्थिति। उपग्रह द्वारा मौसम की निरंतर निगरानी जारी है।',
    advisoryAction: 'सलाह: जल निकासी साफ़ करें, स्थानीय आपदा टीमों को सतर्क करें।',
    warningAction: 'चेतावनी: बाढ़/भूस्खलन का उच्च जोखिम। तत्काल निकासी के लिए तैयार रहें।',
    emergencyAction: 'आपातकाल: तुरंत सुरक्षित क्षेत्रों में निकासी अनिवार्य है!',
    syncButton: 'डेटा अपडेट करें',
    syncing: 'अपडेट हो रहा है…',
    helpline: '24x7 हेल्पलाइन: 1078 / 112',
  },
};

export default function Citizen() {
  const [locations, setLocations] = useState<PredictionResult[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<string>('UK-001');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchRiskData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/risk`);
      const parsed = z.array(PredictionResultSchema).safeParse(res.data);
      if (parsed.success) {
        setLocations(parsed.data);
      }
    } catch (err) {
      console.error('Error fetching risk data:', err);
    }
  };

  useEffect(() => {
    fetchRiskData();

    const ws = new WebSocket(`${WS_BASE_URL}/api/ws/telemetry`);
    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const parsed = z.array(PredictionResultSchema).safeParse(raw);
        if (parsed.success) {
          setLocations(parsed.data);
        }
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

  const activeLoc = locations.find((l) => l.location_id === selectedLoc) || locations[0];
  const t = TRANSLATIONS[lang];

  const getTranslatedAction = (actionEn: string, level: string) => {
    if (lang === 'en') return actionEn;
    if (level === 'LOW') return t.normalAction;
    if (level === 'MODERATE') return t.advisoryAction;
    if (level === 'HIGH') return t.warningAction;
    return t.emergencyAction;
  };

  const getRiskBorder = (level: string) => {
    if (level === 'CRITICAL') return 'bg-bad-soft border-bad text-bad';
    if (level === 'HIGH') return 'bg-accent-soft border-accent text-accent';
    if (level === 'MODERATE') return 'bg-cool-soft border-cool text-cool';
    return 'bg-ok-soft border-ok text-ok';
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <header className="flex justify-between items-start md:items-center mb-6 border-b border-rule pb-4 flex-col md:flex-row gap-4">
          <div>
            <Link
              to="/"
              className="text-accent font-medium flex items-center gap-1.5 mb-2 hover:underline text-xs focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ArrowLeft size={14} /> {t.back}
            </Link>
            <h1 className="text-2xl md:text-3xl font-medium text-ink flex items-center gap-2">
              <Shield className="text-accent" /> {t.title}
            </h1>
            <p className="text-xs text-muted">{t.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 bg-paper-2 rounded-lg border border-rule text-xs text-ink font-medium">
              <span>{t.helpline}</span>
            </div>
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-paper-2 border border-rule rounded-lg hover:bg-paper-3 transition-colors text-xs font-medium text-ink active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
            >
              <RefreshCw size={13} className={isSyncing ? 'motion-safe:animate-spin text-accent' : 'text-accent'} />
              <span>{isSyncing ? t.syncing : t.syncButton}</span>
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-ink hover:opacity-90 rounded-lg text-xs font-medium transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
            >
              <Globe size={14} />
              <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
            </button>
          </div>
        </header>

        {/* Safety Disclaimer Banner (Ground Rule 4) */}
        <div className="mb-6 p-3 bg-paper-2 border border-rule rounded-lg text-xs text-muted flex items-center gap-2">
          <Info size={14} className="text-accent shrink-0" />
          <span>
            Decision-support only. Not a certified warning system; must be validated by qualified
            authorities (IMD, CWC, NDMA) before operational action.
          </span>
        </div>

        <div className="space-y-6">
          {/* Location Selector */}
          <div className="bg-paper-2 p-4 rounded-xl border border-rule">
            <label className="block text-xs font-medium text-muted mb-2 flex items-center gap-1.5">
              <MapPin size={14} className="text-accent" /> {t.selectRegion}
            </label>
            <select
              className="w-full p-2.5 border border-rule rounded-lg bg-paper-3 text-ink text-sm font-medium focus:outline-none focus:border-accent transition-colors"
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
            >
              <optgroup label="Uttarakhand (Himalayas)">
                {locations
                  .filter((l) => l.location_id.startsWith('UK-'))
                  .map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Himachal Pradesh (Western Himalayas)">
                {locations
                  .filter((l) => l.location_id.startsWith('HP-'))
                  .map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Northeast India">
                {locations
                  .filter((l) => l.location_id.startsWith('NE-'))
                  .map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Western Ghats & Southern Hills">
                {locations
                  .filter((l) => l.location_id.startsWith('WG-'))
                  .map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Active Location Status */}
          {activeLoc && (
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border text-center transition-colors ${getRiskBorder(activeLoc.risk_level)}`}>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted mb-1">
                  <Satellite size={14} className="text-accent" /> {t.liveAdvisory}
                </div>

                <div className="text-3xl md:text-4xl font-medium mb-1 tracking-tight">
                  {activeLoc.risk_level} {t.risk}
                </div>
                <div className="text-sm font-normal text-muted mb-4">{activeLoc.location_name}</div>

                {/* Provenance badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-paper-3 rounded-full border border-rule text-xs text-ink mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>
                    Status:{' '}
                    <strong className="font-medium text-accent">
                      {activeLoc.is_simulated ? 'SIMULATED SCENARIO' : 'LIVE TELEMETRY'}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
                  <div className="bg-paper-3 p-3 rounded-xl border border-rule">
                    <div className="text-xs text-muted mb-1">{t.flashFlood}</div>
                    <div className="text-xl font-medium text-ink num">{activeLoc.flood_probability}%</div>
                  </div>
                  <div className="bg-paper-3 p-3 rounded-xl border border-rule">
                    <div className="text-xs text-muted mb-1">{t.landslide}</div>
                    <div className="text-xl font-medium text-ink num">{activeLoc.landslide_probability}%</div>
                  </div>
                </div>

                <div className="p-4 bg-paper-3 rounded-xl text-left max-w-lg w-full mx-auto border border-rule">
                  <h3 className="font-medium text-xs text-ink flex items-center gap-2 mb-2">
                    <AlertCircle size={15} className="text-accent" /> {t.actionReq}
                  </h3>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    {getTranslatedAction(activeLoc.recommended_action, activeLoc.risk_level)}
                  </p>

                  {(activeLoc.risk_level === 'CRITICAL' || activeLoc.risk_level === 'HIGH') && (
                    <ul className="mt-3 list-disc pl-5 space-y-1 text-xs text-bad">
                      <li>{t.avoidStreams}</li>
                      <li>{t.secureKits}</li>
                      <li>{t.moveUphill}</li>
                    </ul>
                  )}
                </div>
              </div>

              {/* Safe Zone Card */}
              <div className="bg-paper-2 p-5 rounded-xl border border-rule">
                <h3 className="font-medium text-sm text-ink mb-3 flex items-center gap-2">
                  <Navigation className="text-accent" size={16} /> {t.shelter}
                </h3>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-paper-3 rounded-lg border border-rule gap-3">
                  <div>
                    <div className="text-xs text-muted mb-1 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-ok" /> {t.verifiedZone}
                    </div>
                    <div className="text-base font-medium text-ink">{activeLoc.safe_zone}</div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-xs text-muted mb-1">{t.evacDist}</div>
                    <div className="text-sm font-medium text-accent num">~1.2 to 2.5 km</div>
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
