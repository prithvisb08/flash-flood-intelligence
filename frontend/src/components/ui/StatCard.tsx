import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: number; // percentage change or numeric delta
  changeLabel?: string;
  updatedAgo?: string;
  isStale?: boolean;
  sparklineData?: number[];
  variant?: 'default' | 'alert' | 'accent';
}

export function StatCard({
  label,
  value,
  unit,
  change,
  changeLabel,
  updatedAgo = 'Just now',
  isStale = false,
  sparklineData,
  variant = 'default',
}: StatCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus size={12} className="text-muted" aria-hidden="true" />;
    }
    if (change > 0) {
      return <TrendingUp size={12} className="text-bad" aria-hidden="true" />;
    }
    return <TrendingDown size={12} className="text-ok" aria-hidden="true" />;
  };

  // Generate lightweight SVG path for sparkline
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 80;
    const height = 24;

    const points = sparklineData.map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${points.join(' L ')}`;

    return (
      <svg
        className="w-20 h-6 shrink-0 overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-rule-2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const borderClass =
    variant === 'alert'
      ? 'border-bad bg-bad-soft'
      : variant === 'accent'
      ? 'border-accent bg-paper-2'
      : 'border-rule bg-paper-2';

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${borderClass} ${
        isStale ? 'opacity-65' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs text-muted font-medium truncate">{label}</span>
        {isStale && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-paper-3 text-muted border border-rule">
            Stale
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-medium text-ink num tracking-tight">
            {value}
          </span>
          {unit && <span className="text-xs text-muted font-medium">{unit}</span>}
        </div>
        {renderSparkline()}
      </div>

      <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-rule">
        <div className="flex items-center gap-1">
          {getTrendIcon()}
          {change !== undefined && (
            <span className="num font-medium text-ink-2">
              {change > 0 ? `+${change}` : change}
              {changeLabel ? ` ${changeLabel}` : '%'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-muted text-xs">
          <Clock size={11} aria-hidden="true" />
          <span>{updatedAgo}</span>
        </div>
      </div>
    </div>
  );
}

export default StatCard;
