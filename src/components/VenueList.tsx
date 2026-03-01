import type { VenueWithScore } from '../types/venue';
import { VenueListItem } from './VenueListItem';

interface VenueListProps {
  venues: VenueWithScore[];
  onSelect: (lng: number, lat: number) => void;
}

export function VenueList({ venues, onSelect }: VenueListProps) {
  if (!venues.length) {
    return (
      <div id="venue-list">
        <div className="vi">
          <div className="vi-name">No venues match this neighborhood.</div>
        </div>
      </div>
    );
  }

  return (
    <div id="venue-list">
      {venues.slice(0, 8).map((venue, index) => (
        <VenueListItem key={venue.id} index={index} venue={venue} onSelect={onSelect} />
      ))}
    </div>
  );
}
