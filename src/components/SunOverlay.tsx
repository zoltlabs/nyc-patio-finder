import type { SunVisualState } from '../types/map';

interface SunOverlayProps {
  sunVisual: SunVisualState;
}

export function SunOverlay({ sunVisual }: SunOverlayProps) {
  return (
    <div
      id="sun-el"
      style={{
        opacity: sunVisual.opacity,
        left: sunVisual.left,
        top: sunVisual.top,
      }}
    >
      <div className="sun-atmo" style={sunVisual.atmoStyle} />
      <div className="sun-corona" style={sunVisual.coronaStyle} />
      <div className="sun-rays" style={sunVisual.raysStyle} />
      <div className="sun-disc" style={sunVisual.discStyle} />
      <div className="sun-flare" style={sunVisual.flareStyle} />
    </div>
  );
}
