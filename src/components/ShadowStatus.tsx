import type { ShadowStatus as ShadowStatusData } from '../types/atmosphere';

interface ShadowStatusProps {
  shadowStatus: ShadowStatusData;
}

export function ShadowStatus({ shadowStatus }: ShadowStatusProps) {
  return (
    <div id="shadow-status">
      <div
        id="shadow-dot"
        className={shadowStatus.state === 'unavailable' ? '' : shadowStatus.state}
      />
      <span id="shadow-label">{shadowStatus.label}</span>
    </div>
  );
}
