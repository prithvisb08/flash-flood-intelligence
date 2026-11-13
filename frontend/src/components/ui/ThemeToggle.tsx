import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('jalrakshak-theme') as 'dark' | 'light' | null;
    const initial = saved || 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('jalrakshak-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-1.5 rounded-md border border-rule bg-paper-2 hover:bg-paper-3 text-muted hover:text-ink transition-colors flex items-center gap-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={14} className="text-accent shrink-0" aria-hidden="true" />
      ) : (
        <Moon size={14} className="text-accent shrink-0" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}

export default ThemeToggle;
