import { Info } from 'lucide-react';

interface DisclaimerBarProps {
  className?: string;
}

export function DisclaimerBar({ className = '' }: DisclaimerBarProps) {
  return (
    <div
      className={`px-3.5 py-2.5 bg-paper-2 border border-rule rounded-lg text-xs text-muted flex items-start gap-2.5 leading-relaxed ${className}`}
      role="note"
      aria-label="Official decision-support notice"
    >
      <Info size={15} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <strong className="text-ink font-medium">Decision support notice:</strong> This operational system provides prognostic hydrological intelligence for authorized disaster-management personnel. It is not an automated public emergency warning authority. All forecasts and catchment risk scores must be verified with certified bodies (Central Water Commission, India Meteorological Department, and State Disaster Management Authorities) prior to issuing civil directives.
      </div>
    </div>
  );
}

export default DisclaimerBar;
