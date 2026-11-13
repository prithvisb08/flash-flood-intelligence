import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorState({
  title = 'Data retrieval issue',
  message = 'Unable to establish real-time connection with hydrological telemetry feeds.',
  onRetry,
  isRetrying = false,
}: ErrorStateProps) {
  return (
    <div
      className="p-6 text-center flex flex-col items-center justify-center border border-rule bg-paper-2 rounded-lg"
      role="alert"
    >
      <div className="p-2 rounded-full bg-bad-soft text-bad mb-2.5">
        <AlertCircle size={20} aria-hidden="true" />
      </div>
      <h3 className="text-sm font-medium text-ink mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="px-3.5 py-1.5 rounded-md bg-paper-3 hover:bg-paper-2 border border-rule text-xs font-medium text-ink transition-colors flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={`text-accent ${isRetrying ? 'motion-safe:animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{isRetrying ? 'Reconnecting…' : 'Retry connection'}</span>
        </button>
      )}
    </div>
  );
}

export default ErrorState;
