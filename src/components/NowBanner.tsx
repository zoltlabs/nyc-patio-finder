import { formatDisplayTime } from '../lib/time';
import type { VenueWithScore } from '../types/venue';

interface NowBannerProps {
  topVenue: VenueWithScore | null;
  heading?: string;
  statusOverride?: string;
  sunUntil: number | null;
  periodColor: string;
  onSelectVenue: (lng: number, lat: number) => void;
}

export function NowBanner({
  topVenue,
  heading,
  statusOverride,
  sunUntil,
  periodColor,
  onSelectVenue,
}: NowBannerProps) {
  if (!topVenue) return null;

  const isShaded = topVenue.geo?.shaded ?? topVenue.score < 40;
  const defaultStatus = (
    <>
      {isShaded ? 'in the shade' : 'in full sun'}
      {sunUntil !== null && !isShaded && (
        <span className="now-banner-until"> · until {formatDisplayTime(sunUntil)}</span>
      )}
    </>
  );

  return (
    <button
      type="button"
      className="now-banner"
      style={{ '--period-color': periodColor } as React.CSSProperties}
      onClick={() => onSelectVenue(topVenue.lng, topVenue.lat)}
    >
      <div className="now-banner-emoji">{isShaded ? '🌥️' : '☀️'}</div>
      <div className="now-banner-content">
        {heading ? <div className="now-banner-kicker">{heading}</div> : null}
        <div className="now-banner-name">{topVenue.name}</div>
        <div className="now-banner-status">{statusOverride ?? defaultStatus}</div>
      </div>
      <div className="now-banner-score" style={{ color: periodColor }}>
        {topVenue.score}
      </div>
    </button>
  );
}
