import type { VenueWithScore } from '../types/venue';
import { VenueListItem } from './VenueListItem';

interface VenueListProps {
  venues: VenueWithScore[];
  emptyMessage?: string;
  onSelect: (lng: number, lat: number) => void;
  onShare: (venue: VenueWithScore) => void;
}

export function VenueList({ venues, emptyMessage, onSelect, onShare }: VenueListProps) {
  if (!venues.length) {
    return (
      <div id="venue-list">
        <div className="vi">
          <div className="vi-name">{emptyMessage ?? 'No venues match the current filters.'}</div>
        </div>
      </div>
    );
  }

  return (
    <div id="venue-list">
      {venues.slice(0, 8).map((venue, index) => (
        <VenueListItem key={venue.id} index={index} venue={venue} onSelect={onSelect} onShare={onShare} />
      ))}
    </div>
  );
}
