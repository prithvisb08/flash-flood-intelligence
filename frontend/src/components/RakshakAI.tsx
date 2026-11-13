import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, Send, X, Loader2, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

const QUICK_PROMPTS = [
  'Manali live telemetry',
  'Critical danger zones',
  'Highest current rainfall',
  'Wayanad basin status',
  'Kedarnath valley',
  'Designated safe shelters',
  'Sensors and satellites',
];

export default function RakshakAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    {
      role: 'ai',
      content:
        'Welcome. I am the JALRAKSHAK Citizen Assistant. You can query telemetry, flood probabilities, river stages, and designated evacuation shelters across India’s monitored hilly basins.',
    },
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

    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai/query`, { query: q });
      const reply = response.data.answer || response.data.response || 'No data available for this query.';
      setMessages((prev) => [...prev, { role: 'ai', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content:
            'Service advisory: Unable to reach the disaster intelligence core. Please check that the server is active.',
        },
      ]);
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
        content:
          'Conversation reset. Ask about any mountain basin or select a quick query below.',
      },
    ]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-3.5 rounded-full bg-accent text-accent-ink hover:opacity-90 transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98] z-40 ${
          isOpen ? 'hidden' : 'flex'
        } items-center justify-center`}
        title="Open citizen assistant"
        aria-label="Open citizen assistant"
      >
        <Bot size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 w-[94vw] sm:w-[440px] h-[560px] max-h-[85vh] bg-paper-2 border border-rule rounded-xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-paper-3 p-3.5 border-b border-rule flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-paper border border-rule rounded-lg text-accent">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-ink font-medium text-sm flex items-center gap-1.5">
                  Citizen assistant
                  <span className="px-1.5 py-0.5 rounded text-xs bg-ok-soft text-ok border border-ok font-normal">
                    Operational decision support
                  </span>
                </h3>
                <p className="text-muted text-xs">32 monitored mountain basins</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-muted hover:text-bad hover:bg-paper rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
                title="Clear conversation"
                aria-label="Clear conversation history"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-muted hover:text-ink hover:bg-paper rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
                title="Close assistant"
                aria-label="Close assistant window"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-paper text-xs">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-lg p-3 flex gap-2.5 ${
                    msg.role === 'user'
                      ? 'bg-accent text-accent-ink font-medium'
                      : 'bg-paper-3 border border-rule text-ink'
                  }`}
                >
                  {msg.role === 'ai' && (
                    <div className="shrink-0 mt-0.5 p-1 bg-paper border border-rule rounded text-accent h-fit">
                      <Bot size={14} />
                    </div>
                  )}
                  <div className="leading-relaxed whitespace-pre-wrap select-text">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-paper-3 border border-rule rounded-lg p-3 flex gap-2 items-center text-muted">
                  <Loader2 size={15} className="text-accent motion-safe:animate-spin" />
                  <span className="text-xs">Evaluating telemetry and hydrological indices…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-paper-3 border-t border-rule flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((promptText, i) => (
              <button
                type="button"
                key={i}
                disabled={isLoading}
                onClick={() => executeQuery(promptText)}
                className="shrink-0 px-2.5 py-1 rounded text-xs font-normal bg-paper hover:bg-paper-2 text-ink-2 border border-rule transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Query Input Bar */}
          <form onSubmit={handleSend} className="p-2.5 bg-paper-3 border-t border-rule flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about live rainfall, flood probability, or safe shelter…"
              className="flex-1 bg-paper border border-rule rounded-lg px-3.5 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3 bg-accent text-accent-ink hover:opacity-90 disabled:opacity-40 rounded-lg transition-colors flex items-center justify-center active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Send query"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
