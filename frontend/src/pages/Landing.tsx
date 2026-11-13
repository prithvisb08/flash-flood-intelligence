import { Link } from 'react-router-dom';
import { ShieldAlert, Activity, Users, Satellite, Radio, Info } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center p-6 relative">
      <div className="text-center max-w-3xl mx-auto space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper-2 border border-rule text-muted text-xs">
          <span>Flash flood intelligence platform</span>
        </div>

        <div className="flex justify-center mb-2">
          <div className="p-3 bg-paper-2 border border-rule rounded-2xl text-accent">
            <ShieldAlert size={48} />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-ink leading-tight">
          JALRAKSHAK
        </h1>

        <h2 className="text-lg md:text-xl font-normal text-muted max-w-xl mx-auto">
          Operational mountain flood intelligence and early-warning decision support system
        </h2>

        <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed">
          Real-time multi-source data fusion combining ISRO INSAT-3DR, NASA GPM,
          Copernicus Sentinel-1 SAR, and ground IoT hydrological radar arrays.
        </p>

        {/* Agency Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-paper-2 border border-rule rounded-md text-xs text-ink-2">
            <Satellite size={13} className="text-accent" /> ISRO MOSDAC
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-paper-2 border border-rule rounded-md text-xs text-ink-2">
            <Satellite size={13} className="text-cool" /> NASA GPM IMERG
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-paper-2 border border-rule rounded-md text-xs text-ink-2">
            <Satellite size={13} className="text-cool" /> Copernicus Sentinel-1
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-paper-2 border border-rule rounded-md text-xs text-ink-2">
            <Radio size={13} className="text-ok" /> IMD Doppler Radar
          </span>
        </div>

        {/* Portal Entry Buttons */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
          <Link
            to="/admin"
            className="p-5 bg-paper-2 hover:bg-paper-3 border border-rule hover:border-rule-2 rounded-xl transition-colors flex flex-col items-start gap-2 focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
          >
            <div className="p-2 bg-paper border border-rule rounded-lg text-accent">
              <Activity size={20} />
            </div>
            <span className="font-medium text-base text-ink">Operational command center</span>
            <span className="text-xs text-muted">
              For disaster management authorities, emergency officers, and verified responders
            </span>
          </Link>

          <Link
            to="/citizen"
            className="p-5 bg-paper-2 hover:bg-paper-3 border border-rule hover:border-rule-2 rounded-xl transition-colors flex flex-col items-start gap-2 focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
          >
            <div className="p-2 bg-paper border border-rule rounded-lg text-cool">
              <Users size={20} />
            </div>
            <span className="font-medium text-base text-ink">Citizen public safety portal</span>
            <span className="text-xs text-muted">
              For local communities, gram panchayats, and accessible safe routing
            </span>
          </Link>
        </div>

        {/* Mandatory Life-Safety Disclaimer Banner (Ground Rule 4) */}
        <div className="mt-8 p-3 bg-paper-2 border border-rule rounded-lg text-xs text-muted max-w-xl mx-auto text-center flex items-center justify-center gap-2">
          <Info size={14} className="text-accent shrink-0" />
          <span>
            Decision-support only. Not a certified warning system; must be validated by qualified
            authorities (IMD, CWC, NDMA) before operational action.
          </span>
        </div>
      </div>
    </div>
  );
}
