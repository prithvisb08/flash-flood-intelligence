import { useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { RiskBadge, type RiskLevel } from './RiskBadge';

export interface AlertItem {
  id: string;
  locationId: string;
  locationName: string;
  riskLevel: RiskLevel;
  headline: string;
  issuedAt: string;
}

interface AlertBannerProps {
  alerts: AlertItem[];
  onSelectLocation?: (locationId: string) => void;
}

export function AlertBanner({ alerts, onSelectLocation }: AlertBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  if (activeAlerts.length === 0) return null;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <div
      className="w-full bg-paper-2 border-b border-rule divide-y divide-rule"
      role="region"
      aria-label="Active emergency warnings"
    >
      {activeAlerts.map((alert) => {
        const isCritical = alert.riskLevel === 'CRITICAL';
        return (
          <div
            key={alert.id}
            onClick={() => onSelectLocation?.(alert.locationId)}
            className={`flex items-center justify-between px-4 py-2 text-xs transition-colors cursor-pointer ${
              isCritical
                ? 'bg-bad-soft text-ink hover:bg-bad-soft'
                : 'bg-paper-2 text-ink hover:bg-paper-3'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {isCritical ? (
                <ShieldAlert size={15} className="text-bad shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle size={15} className="text-accent shrink-0" aria-hidden="true" />
              )}
              <RiskBadge level={alert.riskLevel} size="sm" />
              <span className="font-medium truncate text-ink">
                {alert.locationName}: {alert.headline}
              </span>
              <span className="text-muted shrink-0 hidden md:inline">· {alert.issuedAt}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-2">
              <span className="text-accent hover:underline hidden sm:inline text-xs font-medium">
                View basin details
              </span>
              <button
                type="button"
                onClick={(e) => handleDismiss(alert.id, e)}
                className="p-1 rounded text-muted hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
                aria-label={`Dismiss alert for ${alert.locationName}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AlertBanner;
