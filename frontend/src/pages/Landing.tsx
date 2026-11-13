import { Link } from 'react-router-dom';
import { ShieldAlert, Activity, Users, Satellite, Radio, Sparkles } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black relative overflow-hidden">
      {/* Background glow & grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="text-center max-w-4xl mx-auto space-y-7 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest mb-2 shadow-lg shadow-emerald-950/50">
          <Sparkles size={14} /> Smart India Hackathon 2026 Prototype
        </div>

        <div className="flex justify-center mb-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <ShieldAlert size={68} className="text-emerald-400 animate-pulse" />
          </div>
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 leading-tight">
          JALRAKSHAK
        </h1>
        
        <h2 className="text-xl md:text-2xl font-medium text-slate-200">
          Hyper-Local Flash Flood Intelligence & Early Warning System
        </h2>
        
        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Predict earlier. Warn locally. Act faster. Real-time multi-source data fusion combining 
          <span className="text-cyan-300 font-semibold"> ISRO INSAT-3DR</span>, 
          <span className="text-blue-300 font-semibold"> NASA GPM</span>, 
          <span className="text-emerald-300 font-semibold"> Sentinel-1 SAR</span>, and ground IoT radar arrays.
        </p>

        {/* Agency Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono">
            <Satellite size={13} className="text-orange-400" /> ISRO MOSDAC
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono">
            <Satellite size={13} className="text-blue-400" /> NASA GPM IMERG
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono">
            <Satellite size={13} className="text-cyan-400" /> Copernicus Sentinel-1
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono">
            <Radio size={13} className="text-emerald-400" /> IMD Doppler Radar Grid
          </span>
        </div>

        {/* Portal Entry Buttons */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link 
            to="/admin" 
            className="group relative p-6 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/80 rounded-2xl transition-all duration-300 flex flex-col items-center gap-3 shadow-xl hover:shadow-emerald-950/40 hover:-translate-y-1"
          >
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
              <Activity size={28} />
            </div>
            <span className="font-black text-lg text-white">OPEN CONTROL ROOM</span>
            <span className="text-xs text-slate-400 text-center">For NDMA, SDMA, District Emergency Officers & Responders</span>
          </Link>
          
          <Link 
            to="/citizen" 
            className="group relative p-6 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/80 rounded-2xl transition-all duration-300 flex flex-col items-center gap-3 shadow-xl hover:shadow-cyan-950/40 hover:-translate-y-1"
          >
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">
              <Users size={28} />
            </div>
            <span className="font-black text-lg text-white">PUBLIC SAFETY VIEW</span>
            <span className="text-xs text-slate-400 text-center">For Citizens, Gram Panchayats & Multilingual Safe Routing</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
