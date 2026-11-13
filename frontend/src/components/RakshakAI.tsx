import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, Send, X, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

const QUICK_PROMPTS = [
  "📍 Manali Live",
  "🚨 Critical Danger Zones",
  "🌧️ Sabse Zyada Barish",
  "📍 Wayanad Chooralmala",
  "📍 Kedarnath Valley",
  "🛡️ Safe Shelters",
  "🛰️ Sensors & Satellites",
];

export default function RakshakAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { 
      role: 'ai', 
      content: 'Namaste! 🙏 Main Rakshak AI hoon — aapka real-time Disaster Intelligence & Weather Assistant.\n\nAap mujhse India ke kisi bhi 31 hilly regions (Manali, Shimla, Wayanad, Kedarnath, Cherrapunji, etc.) ka live rainfall, river water level, flood risk, safe shelter, aur satellite data pooch sakte hain!' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const executeQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai/query`, { query: q });
      setMessages(prev => [...prev, { role: 'ai', content: response.data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: '⚠️ Error connecting to Disaster Intelligence Core. Please verify that the backend server is running on port 8000.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    executeQuery(input);
  };

  const handleClear = () => {
    setMessages([
      { 
        role: 'ai', 
        content: 'Namaste! 🙏 Main Rakshak AI hoon. Kisi bhi hilly region ka naam likhein ya niche diye gaye quick prompts par click karke live telemetry check karein!' 
      }
    ]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-xl shadow-blue-900/50 hover:scale-105 transition-transform z-40 ${isOpen ? 'hidden' : 'flex'} items-center justify-center`}
        title="Open Rakshak AI"
      >
        <Sparkles className="absolute text-cyan-300 animate-ping opacity-60" size={34} />
        <Bot size={28} className="relative z-10" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 w-[94vw] sm:w-[460px] h-[600px] max-h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 backdrop-blur-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-3.5 border-b border-slate-700/80 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-xl text-cyan-400 border border-cyan-500/30">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                  Rakshak AI
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest font-bold">
                    LIVE INTELLIGENCE
                  </span>
                </h3>
                <p className="text-slate-400 text-[11px]">31 Monitored Hilly Basins & Satellites</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleClear} 
                className="p-1.5 text-slate-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors"
                title="Clear Chat History"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Close Window"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-950/70 text-xs">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl p-3 flex gap-2.5 shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm font-medium' 
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.role === 'ai' && (
                    <div className="shrink-0 mt-0.5 p-1 bg-cyan-500/10 rounded-md h-fit text-cyan-400">
                      <Bot size={14} />
                    </div>
                  )}
                  <div className="leading-relaxed whitespace-pre-wrap select-text">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm p-3 flex gap-2 items-center text-slate-400">
                  <Loader2 size={15} className="text-cyan-400 animate-spin" />
                  <span className="text-[11px] font-mono">Analyzing multi-satellite telemetry & sensors...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((promptText, i) => (
              <button
                key={i}
                disabled={isLoading}
                onClick={() => executeQuery(promptText.replace(/^[^a-zA-Z0-9]+/, '').trim())}
                className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 hover:border-cyan-500/50 transition-all active:scale-95"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Query Input Bar */}
          <form onSubmit={handleSend} className="p-2.5 bg-slate-900 border-t border-slate-800 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Manali live rain, Wayanad risk, Sabse zyada barish..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center shadow-md active:scale-95"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
