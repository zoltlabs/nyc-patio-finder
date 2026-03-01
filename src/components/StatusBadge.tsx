import type { OSMStatus } from '../types/atmosphere';

interface StatusBadgeProps {
  status: OSMStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = status.tone === 'success' ? '#44cc88' : status.tone === 'warning' ? '#ffaa44' : '#44cc88';

  return (
    <div id="osm-badge" className="card">
      <div id="osm-dot" style={{ background: color, boxShadow: `0 0 6px ${color}66` }} />
      <span className="caps" style={{ color: 'var(--text)', opacity: 0.8 }}>{status.label}</span>
    </div>
  );
}
