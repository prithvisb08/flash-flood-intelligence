import { Radio, Cpu, FlaskConical } from 'lucide-react';

interface SourceTagProps {
  isSimulated?: boolean;
  sourceName?: string;
  sourceType?: 'LIVE' | 'DERIVED' | 'SIMULATED';
  size?: 'xs' | 'sm';
}

export function SourceTag({
  isSimulated = false,
  sourceName,
  sourceType,
  size = 'xs',
}: SourceTagProps) {
  const type = isSimulated ? 'SIMULATED' : sourceType || 'LIVE';

  if (type === 'SIMULATED') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded border border-rule-2 bg-paper-2 text-ink-2 badge-simulated ${
          size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
        }`}
        title="Simulated test data; not live operational readings"
      >
        <FlaskConical size={12} className="text-muted shrink-0" aria-hidden="true" />
        <span>Simulated</span>
        {sourceName && <span className="text-muted">({sourceName})</span>}
      </span>
    );
  }

  if (type === 'DERIVED') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded border border-rule bg-paper-3 text-ink-2 ${
          size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
        }`}
        title="Derived mathematical / hydrological model output"
      >
        <Cpu size={12} className="text-accent shrink-0" aria-hidden="true" />
        <span>Derived</span>
        {sourceName && <span className="text-muted">({sourceName})</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded border border-rule bg-paper-2 text-ink ${
        size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
      title="Verified live telemetry stream"
    >
      <Radio size={12} className="text-ok shrink-0" aria-hidden="true" />
      <span>Live</span>
      {sourceName && <span className="text-muted">({sourceName})</span>}
    </span>
  );
}

export default SourceTag;
