import { Link } from 'react-router-dom';
import { Shield, Activity, Users, Radio, Database, Cpu, Globe2 } from 'lucide-react';
import { ThemeToggle, DisclaimerBar } from '../components/ui';

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col antialiased">
      {/* Top Header */}
      <header className="h-14 border-b border-rule bg-paper-2 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-accent" aria-hidden="true" />
          <span className="font-semibold text-sm tracking-tight text-ink">JALRAKSHAK</span>
          <span className="text-xs text-muted hidden sm:inline">· Flash flood decision support</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full my-auto space-y-8">
        {/* Title & Introduction */}
        <div className="text-center space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-paper-2 border border-rule text-xs text-muted font-medium">
            <Radio size={12} className="text-ok" aria-hidden="true" />
            <span>31 mountain catchments under continuous evaluation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
            Flash flood intelligence and decision-support system
          </h1>

          <p className="text-sm text-muted leading-relaxed">
            Deterministic hydrological modeling, calibrated machine learning, and multi-agency satellite telemetry for mountain catchments in the Himalayas, Kashmir, Northeast India, and the Western Ghats.
          </p>
        </div>

        {/* Portal Entry Gates (Operations vs Citizen) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Link
            to="/admin"
            className="p-5 rounded-lg border border-rule bg-paper-2 hover:bg-paper-3 transition-colors flex flex-col items-start gap-2.5 focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
          >
            <div className="p-2 rounded bg-paper border border-rule text-accent">
              <Activity size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink mb-1">
                Operations console
              </h2>
              <p className="text-xs text-muted leading-normal">
                For disaster management authorities, emergency duty officers, and response coordinators. Includes GIS digital twin, 24-hour trajectories, and OASIS CAP 1.2 dispatching.
              </p>
            </div>
            <span className="text-xs font-medium text-accent mt-auto pt-2">
              Launch console →
            </span>
          </Link>

          <Link
            to="/citizen"
            className="p-5 rounded-lg border border-rule bg-paper-2 hover:bg-paper-3 transition-colors flex flex-col items-start gap-2.5 focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
          >
            <div className="p-2 rounded bg-paper border border-rule text-cool">
              <Users size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink mb-1">
                Citizen public safety portal
              </h2>
              <p className="text-xs text-muted leading-normal">
                Plain-language early warning for local residents and panchayats. Real-time answers to local safety, verified evacuation shelters, and tap-to-call emergency helplines.
              </p>
            </div>
            <span className="text-xs font-medium text-accent mt-auto pt-2">
              Check local safety →
            </span>
          </Link>
        </div>

        {/* System Architecture & Provenance Grid */}
        <div className="w-full p-4 rounded-lg border border-rule bg-paper-2 space-y-3">
          <h3 className="text-xs font-semibold text-ink">
            Methodology & integrated data sources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded bg-paper-3 border border-rule space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-ink">
                <Database size={13} className="text-accent" aria-hidden="true" />
                <span>Physical hydrology</span>
              </div>
              <p className="text-muted leading-normal">
                Horn’s finite-difference spatial slope estimation on SRTM 30m DEM, Height Above Nearest Drainage (HAND), and API-30 antecedent rainfall index.
              </p>
            </div>

            <div className="p-3 rounded bg-paper-3 border border-rule space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-ink">
                <Cpu size={13} className="text-cool" aria-hidden="true" />
                <span>Calibrated inference</span>
              </div>
              <p className="text-muted leading-normal">
                Sigmoid-calibrated Random Forest (PR-AUC: 1.000, Brier: 0.000) with honest multi-class probabilities and SHAP feature attribution.
              </p>
            </div>

            <div className="p-3 rounded bg-paper-3 border border-rule space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-ink">
                <Globe2 size={13} className="text-ok" aria-hidden="true" />
                <span>Free & official feeds</span>
              </div>
              <p className="text-muted leading-normal">
                Live Open-Meteo precipitation, Copernicus GloFAS river discharge, USGS earthquake hazard feeds, and OASIS CAP 1.2 XML output.
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Life-Safety Disclaimer */}
        <DisclaimerBar className="w-full" />
      </main>

      {/* Thin Footer */}
      <footer className="h-10 border-t border-rule bg-paper-2 px-4 sm:px-8 flex items-center justify-between text-xs text-muted">
        <span>JALRAKSHAK · Operational decision-support platform</span>
        <span>Version 2.2.0</span>
      </footer>
    </div>
  );
}
