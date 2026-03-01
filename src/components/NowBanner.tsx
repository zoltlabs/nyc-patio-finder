import { formatDisplayTime } from '../lib/time';
import type { VenueWithScore } from '../types/venue';

interface NowBannerProps {
  topVenue: VenueWithScore | null;
  sunUntil: number | null;
  periodColor: string;
  onSelectVenue: (lng: number, lat: number) => void;
}

export function NowBanner({ topVenue, sunUntil, periodColor, onSelectVenue }: NowBannerProps) {
  if (!topVenue) return null;

  const isShaded = topVenue.geo?.shaded ?? topVenue.score < 40;

  return (
    <button
      type="button"
      className="now-banner"
      style={{ '--period-color': periodColor } as React.CSSProperties}
      onClick={() => onSelectVenue(topVenue.lng, topVenue.lat)}
    >
      <div className="now-banner-emoji">{isShaded ? '🌥️' : '☀️'}</div>
      <div className="now-banner-content">
        <div className="now-banner-name">{topVenue.name}</div>
        <div className="now-banner-status">
          {isShaded ? 'in the shade' : 'in full sun'}
          {sunUntil !== null && !isShaded && (
            <span className="now-banner-until"> · until {formatDisplayTime(sunUntil)}</span>
          )}
        </div>
      </div>
      <div className="now-banner-score" style={{ color: periodColor }}>
        {topVenue.score}
      </div>
    </button>
  );
}
