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
  RefreshCw,
  PhoneCall,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { API_BASE_URL, WS_BASE_URL } from '../config';
import { type PredictionResult, PredictionResultSchema } from '../schemas';
import { RiskBadge, SourceTag, DisclaimerBar, ThemeToggle } from '../components/ui';

const TRANSLATIONS = {
  en: {
    back: 'Back to portal',
    title: 'Public safety guidance',
    subtitle: 'Hyper-local flood early warning and emergency shelter locator',
    selectRegion: 'Select your mountain catchment or district:',
    question: 'Is my area safe right now?',
    safeHeadline: 'Current conditions are within normal baseline.',
    warningHeadline: 'Active flood surge threat: follow local safety directives.',
    risk: 'threat level',
    flashFlood: 'Flash flood probability',
    landslide: 'Landslide hazard index',
    actionReq: 'What to do right now:',
    avoidStreams: 'Stay away from mountain streams, culverts, and low footpaths.',
    secureKits: 'Keep emergency supplies, mobile torch, and clean water ready.',
    moveUphill: 'Move uphill towards designated evacuation shelters if rain persists.',
    shelter: 'Designated emergency safe shelter',
    verifiedZone: 'Verified high-ground evacuation shelter',
    evacDist: 'Estimated distance',
    normalAction: 'Normal baseline operations. Continuous telemetry monitoring active.',
    advisoryAction: 'Advisory: Clear local drainage channels and stay alert to weather changes.',
    warningAction: 'Warning: High risk of sudden surge. Prepare for immediate evacuation.',
    emergencyAction: 'EMERGENCY: Immediate evacuation to safe zones required. Flash flood imminent!',
    syncButton: 'Sync telemetry',
    syncing: 'Syncing…',
    call1078: 'Call 1078 (NDRF Disaster line)',
    call112: 'Call 112 (National emergency)',
  },
  hi: {
    back: 'पोर्टल पर वापस जाएँ',
    title: 'जन सुरक्षा निर्देश',
    subtitle: 'अति-स्थानीय बाढ़ चेतावनी एवं आपातकालीन आश्रय लोकेटर',
    selectRegion: 'अपना पर्वतीय क्षेत्र या जिला चुनें:',
    question: 'क्या मेरा क्षेत्र अभी सुरक्षित है?',
    safeHeadline: 'वर्तमान स्थिति सामान्य सीमा में है।',
    warningHeadline: 'सक्रिय बाढ़ चेतावनी: स्थानीय सुरक्षा निर्देशों का पालन करें।',
    risk: 'खतरा स्तर',
    flashFlood: 'बाढ़ की संभावना',
    landslide: 'भूस्खलन का जोखिम',
    actionReq: 'अभी क्या करें:',
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
    call1078: '1078 पर कॉल करें (NDRF आपदा हेल्पलाइन)',
    call112: '112 पर कॉल करें (राष्ट्रीय आपातकाल)',
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

  const isHighRisk = activeLoc && (activeLoc.risk_level === 'CRITICAL' || activeLoc.risk_level === 'HIGH');

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col items-center p-3 sm:p-6 antialiased">
      <div className="w-full max-w-xl space-y-4">
        {/* Navigation & Controls Bar */}
        <header className="flex justify-between items-center pb-3 border-b border-rule gap-2">
          <Link
            to="/"
            className="text-muted hover:text-ink flex items-center gap-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>{t.back}</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="p-1.5 rounded-md border border-rule bg-paper-2 hover:bg-paper-3 text-muted hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50"
              title={t.syncButton}
              aria-label={t.syncButton}
            >
              <RefreshCw size={13} className={isSyncing ? 'motion-safe:animate-spin' : ''} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="px-2.5 py-1 rounded-md border border-rule bg-paper-2 hover:bg-paper-3 text-xs font-medium text-ink flex items-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
            >
              <Globe size={13} className="text-accent" aria-hidden="true" />
              <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
            </button>

            <ThemeToggle />
          </div>
        </header>

        {/* Catchment Basin Selector */}
        <div className="p-3.5 bg-paper-2 border border-rule rounded-lg">
          <label htmlFor="basin-select" className="block text-xs font-medium text-muted mb-1.5 flex items-center gap-1.5">
            <MapPin size={13} className="text-accent" aria-hidden="true" />
            <span>{t.selectRegion}</span>
          </label>
          <select
            id="basin-select"
            className="w-full p-2.5 border border-rule rounded-md bg-paper-3 text-ink text-sm font-medium focus:outline-none focus:border-accent transition-colors cursor-pointer"
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

        {/* 1. Core Question Answer: Big Calm Status Card */}
        {activeLoc && (
          <div className="space-y-4">
            <div
              className={`p-5 rounded-lg border transition-colors ${
                isHighRisk ? 'bg-bad-soft border-bad' : 'bg-paper-2 border-rule'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-muted tracking-tight">
                  {t.question}
                </span>
                <SourceTag isSimulated={activeLoc.is_simulated} sourceName={activeLoc.data_source} />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <RiskBadge level={activeLoc.risk_level} size="lg" />
                <div>
                  <h2 className="text-base font-semibold text-ink leading-snug">
                    {activeLoc.location_name}
                  </h2>
                  <p className="text-xs text-muted">
                    {isHighRisk ? t.warningHeadline : t.safeHeadline}
                  </p>
                </div>
              </div>

              {/* Numerical Metrics */}
              <div className="grid grid-cols-2 gap-2.5 my-3 pt-3 border-t border-rule">
                <div className="p-2.5 rounded bg-paper-3 border border-rule">
                  <span className="block text-xs text-muted mb-0.5">{t.flashFlood}</span>
                  <span className="text-xl font-medium text-ink num">
                    {activeLoc.flood_probability}%
                  </span>
                </div>
                <div className="p-2.5 rounded bg-paper-3 border border-rule">
                  <span className="block text-xs text-muted mb-0.5">{t.landslide}</span>
                  <span className="text-xl font-medium text-ink num">
                    {activeLoc.landslide_probability}%
                  </span>
                </div>
              </div>

              {/* Action Directive */}
              <div className="p-3 bg-paper-3 rounded-md border border-rule space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <AlertCircle size={14} className="text-accent shrink-0" aria-hidden="true" />
                  <span>{t.actionReq}</span>
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {getTranslatedAction(activeLoc.recommended_action, activeLoc.risk_level)}
                </p>
                {isHighRisk && (
                  <ul className="pt-2 border-t border-rule list-disc pl-4 space-y-1 text-xs text-bad">
                    <li>{t.avoidStreams}</li>
                    <li>{t.secureKits}</li>
                    <li>{t.moveUphill}</li>
                  </ul>
                )}
              </div>
            </div>

            {/* 2. Safe Shelter Guidance */}
            <div className="p-4 bg-paper-2 border border-rule rounded-lg">
              <h3 className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
                <Navigation size={13} className="text-accent" aria-hidden="true" />
                <span>{t.shelter}</span>
              </h3>
              <div className="p-3 bg-paper-3 rounded-md border border-rule flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-ok flex items-center gap-1 mb-0.5 font-medium">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    <span>{t.verifiedZone}</span>
                  </div>
                  <div className="text-sm font-semibold text-ink">{activeLoc.safe_zone}</div>
                </div>
                <div className="sm:text-right shrink-0">
                  <span className="block text-xs text-muted">{t.evacDist}</span>
                  <span className="text-xs font-medium text-accent num">~1.2 to 2.5 km</span>
                </div>
              </div>
            </div>

            {/* 3. Emergency Helpline Call Buttons (≥44px tap targets) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href="tel:1078"
                className="h-12 px-4 rounded-md bg-paper-2 hover:bg-paper-3 border border-rule text-ink text-xs font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
              >
                <PhoneCall size={16} className="text-bad shrink-0" aria-hidden="true" />
                <span>{t.call1078}</span>
              </a>

              <a
                href="tel:112"
                className="h-12 px-4 rounded-md bg-paper-2 hover:bg-paper-3 border border-rule text-ink text-xs font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
              >
                <Shield size={16} className="text-accent shrink-0" aria-hidden="true" />
                <span>{t.call112}</span>
              </a>
            </div>

            {/* Persistent Disclaimer */}
            <DisclaimerBar />
          </div>
        )}
      </div>
    </div>
  );
}
