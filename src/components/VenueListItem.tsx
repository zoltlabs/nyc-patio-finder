import { Building2, Coffee, GlassWater, Leaf, Martini, Sun, Utensils, CloudOff, Share2 } from 'lucide-react';
import { scoreColor } from '../lib/colors';
import type { VenueWithScore, Venue, VenueCategory, OutdoorSetting } from '../types/venue';

interface VenueListItemProps {
  index: number;
  venue: VenueWithScore;
  onSelect: (lng: number, lat: number) => void;
  onShare: (venue: VenueWithScore) => void;
}

function OutdoorSettingIcon({ outdoorSetting }: { outdoorSetting: OutdoorSetting }) {
  const iconProps = { size: 12, strokeWidth: 1.5 };
  switch (outdoorSetting) {
    case 'rooftop': return <Building2 {...iconProps} />;
    case 'garden': return <Leaf {...iconProps} />;
    case 'patio': return <Coffee {...iconProps} />;
    default: return null;
  }
}

function CategoryIcon({ category }: { category: VenueCategory }) {
  const iconProps = { size: 12, strokeWidth: 1.5 };
  switch (category) {
    case 'bar': return <Martini {...iconProps} />;
    case 'restaurant': return <Utensils {...iconProps} />;
    case 'cafe': return <Coffee {...iconProps} />;
    case 'brewery': return <GlassWater {...iconProps} />;
    default: return null;
  }
}

function formatCategoryLabel(category: VenueCategory): string {
  switch (category) {
    case 'bar': return 'bar';
    case 'restaurant': return 'restaurant';
    case 'cafe': return 'cafe';
    case 'brewery': return 'brewery';
  }
}

function formatOutdoorSettingLabel(outdoorSetting: Venue['outdoorSetting']): string {
  switch (outdoorSetting) {
    case 'rooftop': return 'rooftop';
    case 'garden': return 'garden';
    case 'patio': return 'patio';
  }
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) return `${hours}h ${remainingMinutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainingMinutes}m`;
}

export function VenueListItem({ index, venue, onSelect, onShare }: VenueListItemProps) {
  const rank = (index + 1).toString().padStart(2, '0');
  const windowMetrics = venue.windowMetrics;
  const scoreLabel = windowMetrics ? `${Math.round(windowMetrics.averageScore)}` : `${venue.score}`;
  const reason = windowMetrics?.explanation ?? venue.geo?.reason ?? null;

  return (
    <div className={`vi${index < 3 ? ' top' : ''}${venue.geo?.shaded ? ' shaded' : ''}`}>
      <button
        type="button"
        className="vi-main"
        onClick={() => onSelect(venue.lng, venue.lat)}
      >
        <div className="vi-head">
          <div className="vi-name">
            <span className="vi-rank">{rank}.</span> {venue.name}
          </div>
          <div className="vi-score" style={{ color: scoreColor(venue.score) }}>
            {scoreLabel}
          </div>
        </div>
        <div className="vi-meta">
          <span className="vi-hood">{venue.hood}</span>
          <span className={`vi-badge category-${venue.category}`}>
            <CategoryIcon category={venue.category} />
            {formatCategoryLabel(venue.category)}
          </span>
          <span className={`vi-badge setting-${venue.outdoorSetting}`}>
            <OutdoorSettingIcon outdoorSetting={venue.outdoorSetting} />
            {formatOutdoorSettingLabel(venue.outdoorSetting)}
          </span>
          {venue.geo ? (
            <span className={`vi-badge ${venue.geo.shaded ? 'shade-badge' : 'sun-badge'}`}>
              {venue.geo.shaded ? (
                <CloudOff size={10} strokeWidth={2} />
              ) : (
                <Sun size={10} strokeWidth={2} />
              )}
              {venue.geo.shaded ? 'shaded' : 'direct sun'}
            </span>
          ) : null}
          {windowMetrics ? (
            <span className="vi-badge vi-badge-window">
              {formatMinutes(windowMetrics.totalSunnyMinutes)} sun
            </span>
          ) : null}
        </div>
        {reason ? <div className="vi-reason">{reason}</div> : null}
        {windowMetrics ? (
          <div className="vi-timeline" aria-hidden="true">
            {windowMetrics.timeline.map((sample) => (
              <span
                key={`${venue.id}-${sample.hour}`}
                className={`vi-timeline-segment${sample.sunny ? ' sunny' : ' shaded'}`}
                style={{ opacity: Math.max(0.3, sample.score / 100) }}
              />
            ))}
          </div>
        ) : null}
        <div className="score-track">
          <div
            className="score-fill"
            style={{ width: `${venue.score}%`, background: scoreColor(venue.score) }}
          />
        </div>
      </button>
      <button
        type="button"
        className="vi-share-btn"
        aria-label={`Share ${venue.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onShare(venue);
        }}
      >
        <Share2 size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
