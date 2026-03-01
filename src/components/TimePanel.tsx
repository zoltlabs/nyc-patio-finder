import type { AtmosphereState } from '../types/atmosphere';
import { formatDisplayTime } from '../lib/time';

interface TimePanelProps {
  atmosphereState: AtmosphereState;
  currentHour: number;
  subtitle: string;
  onHourChange: (hour: number) => void;
}

export function TimePanel({ atmosphereState, currentHour, subtitle, onHourChange }: TimePanelProps) {
  const sliderPct = (currentHour / 23) * 100;

  return (
    <div
      id="time-panel"
      className="card"
      style={{ '--period-color': atmosphereState.nameC } as React.CSSProperties}
    >
      <div id="time-head">
        <span id="time-val">{formatDisplayTime(currentHour)}</span>
        <span id="time-sub">{subtitle}</span>
      </div>
      <div id="slider-wrap">
        <div id="slider-rainbow" />
        <input
          id="slider"
          type="range"
          min="0"
          max="23"
          step="0.25"
          value={currentHour}
          onChange={(event) => onHourChange(Number(event.target.value))}
          style={{
            background: `linear-gradient(to right, ${atmosphereState.nameC}55 ${sliderPct}%, rgba(255,255,255,0.08) ${sliderPct}%)`,
          }}
        />
      </div>
      <div id="time-labels">
        <span>Midnight</span>
        <span>Sunrise</span>
        <span>Noon</span>
        <span>Sunset</span>
        <span>Night</span>
      </div>
    </div>
  );
}
