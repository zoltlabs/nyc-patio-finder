import { Building2, Leaf, Coffee, Sun, CloudOff } from 'lucide-react';
import { scoreColor } from '../lib/colors';
import type { VenueWithScore, Venue } from '../types/venue';

interface VenueListItemProps {
  index: number;
  venue: VenueWithScore;
  onSelect: (lng: number, lat: number) => void;
}

function TypeIcon({ type }: { type: Venue['type'] }) {
  const iconProps = { size: 12, strokeWidth: 1.5 };
  switch (type) {
    case 'rooftop': return <Building2 {...iconProps} />;
    case 'garden': return <Leaf {...iconProps} />;
    case 'patio': return <Coffee {...iconProps} />;
    default: return null;
  }
}

export function VenueListItem({ index, venue, onSelect }: VenueListItemProps) {
  const rank = (index + 1).toString().padStart(2, '0');
  
  return (
    <button
      type="button"
      className={`vi${index < 3 ? ' top' : ''}${venue.geo?.shaded ? ' shaded' : ''}`}
      onClick={() => onSelect(venue.lng, venue.lat)}
    >
      <div className="vi-head">
        <div className="vi-name">
          <span className="vi-rank">{rank}.</span> {venue.name}
        </div>
        <div className="vi-score" style={{ color: scoreColor(venue.score) }}>
          {venue.score}
        </div>
      </div>
      <div className="vi-meta">
        <span className="vi-hood">{venue.hood}</span>
        <span className={`vi-badge type-${venue.type}`}>
          <TypeIcon type={venue.type} />
          {venue.type}
        </span>
        {venue.geo ? (
          <>
            <span className={`vi-badge ${venue.geo.shaded ? 'shade-badge' : 'sun-badge'}`}>
              {venue.geo.shaded ? (
                <CloudOff size={10} strokeWidth={2} />
              ) : (
                <Sun size={10} strokeWidth={2} />
              )}
              {venue.geo.shaded ? 'shaded' : 'direct sun'}
            </span>
          </>
        ) : null}
      </div>
      {venue.geo?.reason ? <div className="vi-reason">{venue.geo.reason}</div> : null}
      <div className="score-track">
        <div
          className="score-fill"
          style={{ width: `${venue.score}%`, background: scoreColor(venue.score) }}
        />
      </div>
    </button>
  );
}
