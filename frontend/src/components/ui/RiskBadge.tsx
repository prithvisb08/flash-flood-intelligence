import { ShieldCheck, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function RiskBadge({ level, size = 'sm', showIcon = true }: RiskBadgeProps) {
  const normLevel = (level || 'LOW').toUpperCase();

  const config = {
    LOW: {
      label: 'Low risk',
      icon: ShieldCheck,
      classes: 'bg-ok-soft text-ok border border-ok',
    },
    MODERATE: {
      label: 'Moderate risk',
      icon: AlertCircle,
      classes: 'bg-cool-soft text-cool border border-cool',
    },
    HIGH: {
      label: 'High risk',
      icon: AlertTriangle,
      classes: 'bg-accent-soft text-accent border border-accent',
    },
    CRITICAL: {
      label: 'Critical risk',
      icon: ShieldAlert,
      classes: 'bg-bad-soft text-bad border border-bad',
    },
  }[normLevel] || {
    label: normLevel,
    icon: AlertCircle,
    classes: 'bg-paper-3 text-muted border border-rule',
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium shrink-0 ${sizeClasses} ${config.classes}`}
      aria-label={`Risk classification: ${config.label}`}
    >
      {showIcon && <IconComponent size={iconSizes} className="shrink-0" aria-hidden="true" />}
      <span className="whitespace-nowrap">{config.label}</span>
    </span>
  );
}

export default RiskBadge;
