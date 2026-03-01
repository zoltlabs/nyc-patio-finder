import type { AtmosphereState, ShadowStatus as ShadowStatusData } from '../types/atmosphere';
import type { VenueWithScore } from '../types/venue';
import { NeighborhoodFilter } from './NeighborhoodFilter';
import { ShadowStatus } from './ShadowStatus';
import { VenueList } from './VenueList';

interface SidebarProps {
  atmosphereState: AtmosphereState;
  dateLabel: string;
  neighborhoods: string[];
  onFitToVenues: () => void;
  onNeighborhoodChange: (value: string) => void;
  onViewportToggle: (value: boolean) => void;
  onSelectVenue: (lng: number, lat: number) => void;
  mapViewCount: number;
  scoredVenues: VenueWithScore[];
  selectedNeighborhood: string;
  shadowStatus: ShadowStatusData;
  sunAltitude: number;
  viewportOnly: boolean;
}

export function Sidebar({
  atmosphereState,
  dateLabel,
  neighborhoods,
  onFitToVenues,
  onNeighborhoodChange,
  onViewportToggle,
  onSelectVenue,
  mapViewCount,
  scoredVenues,
  selectedNeighborhood,
  shadowStatus,
  sunAltitude,
  viewportOnly,
}: SidebarProps) {
  const pct = Math.max(0, Math.min(100, (sunAltitude / 62) * 100));

  return (
    <div
      id="sidebar"
      className="card"
      style={{ '--period-color': atmosphereState.nameC } as React.CSSProperties}
    >
      <div id="sidebar-title">
        <strong>NYC</strong> <span>Patio Finder</span>
      </div>
      <div id="date-label">{dateLabel}</div>
      <div
        id="period-badge"
        style={{
          background: `${atmosphereState.nameC}14`,
          borderColor: `${atmosphereState.nameC}33`,
          color: atmosphereState.nameC,
        }}
      >
        {atmosphereState.name}
      </div>

      <NeighborhoodFilter
        neighborhoods={neighborhoods}
        selectedNeighborhood={selectedNeighborhood}
        onChange={onNeighborhoodChange}
      />

      <label id="viewport-filter">
        <input
          type="checkbox"
          checked={viewportOnly}
          onChange={(event) => onViewportToggle(event.target.checked)}
        />
        <span>In map view</span>
        <strong>{mapViewCount}</strong>
      </label>

      <button
        id="fit-venues-btn"
        type="button"
        onClick={onFitToVenues}
        disabled={scoredVenues.length === 0}
      >
        Fit map to results
      </button>

      <ShadowStatus shadowStatus={shadowStatus} />

      <div id="alt-row">
        <span className="caps">Sun</span>
        <div id="alt-track">
          <div id="alt-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div id="list-title" className="caps">
        Recommended Spots
      </div>
      <VenueList venues={scoredVenues} onSelect={onSelectVenue} />
    </div>
  );
}
