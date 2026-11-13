import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = 'No records found',
  description = 'No catchment basins match your active filter criteria.',
  action,
}: EmptyStateProps) {
  return (
    <div className="p-8 text-center flex flex-col items-center justify-center border border-dashed border-rule rounded-lg bg-paper-2">
      <div className="p-2.5 rounded-full bg-paper-3 text-muted mb-2.5">
        <Inbox size={20} aria-hidden="true" />
      </div>
      <h3 className="text-sm font-medium text-ink mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-xs mb-3">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-3 py-1.5 rounded-md bg-paper-3 hover:bg-paper border border-rule text-xs font-medium text-ink transition-colors focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.98]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
