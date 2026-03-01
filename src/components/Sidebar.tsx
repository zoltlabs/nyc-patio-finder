import type { AtmosphereState, ShadowStatus as ShadowStatusData } from '../types/atmosphere';
import type { OutdoorSetting, VenueCategory, VenueWithScore } from '../types/venue';
import { CategoryFilter } from './CategoryFilter';
import { NeighborhoodFilter } from './NeighborhoodFilter';
import { NowBanner } from './NowBanner';
import { OutdoorSettingFilter } from './OutdoorSettingFilter';
import { ShadowStatus } from './ShadowStatus';
import { TimePanel } from './TimePanel';
import { VenueList } from './VenueList';

interface SidebarProps {
  atmosphereState: AtmosphereState;
  categories: VenueCategory[];
  currentHour: number;
  dateLabel: string;
  isExploring: boolean;
  isMobile: boolean;
  sheetExpanded: boolean;
  neighborhoods: string[];
  onFitToVenues: () => void;
  onCategoryChange: (value: VenueCategory | 'all') => void;
  onNeighborhoodChange: (value: string) => void;
  onOutdoorSettingChange: (value: OutdoorSetting | 'all') => void;
  onViewportToggle: (value: boolean) => void;
  onSelectVenue: (lng: number, lat: number) => void;
  onShare: (venue: VenueWithScore) => void;
  onHourChange: (hour: number) => void;
  onResetToNow: () => void;
  onToggleSheet: () => void;
  outdoorSettings: OutdoorSetting[];
  mapViewCount: number;
  scoredVenues: VenueWithScore[];
  selectedCategory: VenueCategory | 'all';
  selectedNeighborhood: string;
  selectedOutdoorSetting: OutdoorSetting | 'all';
  shadowStatus: ShadowStatusData;
  sunAltitude: number;
  sunUntil: number | null;
  viewportOnly: boolean;
}

export function Sidebar({
  atmosphereState,
  categories,
  currentHour,
  dateLabel,
  isExploring,
  isMobile,
  sheetExpanded,
  neighborhoods,
  onFitToVenues,
  onCategoryChange,
  onNeighborhoodChange,
  onOutdoorSettingChange,
  onViewportToggle,
  onSelectVenue,
  onShare,
  onHourChange,
  onResetToNow,
  onToggleSheet,
  outdoorSettings,
  mapViewCount,
  scoredVenues,
  selectedCategory,
  selectedNeighborhood,
  selectedOutdoorSetting,
  shadowStatus,
  sunAltitude,
  sunUntil,
  viewportOnly,
}: SidebarProps) {
  const pct = Math.max(0, Math.min(100, (sunAltitude / 62) * 100));
  const topVenue = scoredVenues[0] ?? null;

  const sheetStyle = isMobile
    ? {
        transform: sheetExpanded ? 'translateY(30%)' : 'translateY(calc(100% - 140px))',
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }
    : undefined;

  return (
    <div
      id="sidebar"
      className={`card${isMobile ? ' sidebar-mobile' : ''}`}
      style={{
        '--period-color': atmosphereState.nameC,
        ...sheetStyle,
      } as React.CSSProperties}
    >
      {isMobile && (
        <button type="button" className="sheet-drag-handle" onClick={onToggleSheet} aria-label="Toggle sheet">
          <div className="sheet-handle-bar" />
          {!sheetExpanded && topVenue && (
            <div className="sheet-collapsed-preview">
              <span className="sheet-preview-name">{topVenue.name}</span>
              <span className="sheet-preview-score" style={{ color: atmosphereState.nameC }}>
                {topVenue.score}
              </span>
              <span
                className="sheet-preview-badge"
                style={{
                  background: `${atmosphereState.nameC}14`,
                  borderColor: `${atmosphereState.nameC}33`,
                  color: atmosphereState.nameC,
                }}
              >
                {atmosphereState.name}
              </span>
            </div>
          )}
        </button>
      )}

      {!isMobile && (
        <>
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
        </>
      )}

      <NowBanner
        topVenue={topVenue}
        sunUntil={sunUntil}
        periodColor={atmosphereState.nameC}
        onSelectVenue={onSelectVenue}
      />

      {(!isMobile || sheetExpanded) && (
        <>
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

          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onChange={onCategoryChange}
          />

          <OutdoorSettingFilter
            outdoorSettings={outdoorSettings}
            selectedOutdoorSetting={selectedOutdoorSetting}
            onChange={onOutdoorSettingChange}
          />

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
            Best Sunny Spots Right Now
          </div>
        </>
      )}

      <VenueList venues={scoredVenues} onSelect={onSelectVenue} onShare={onShare} />

      {isMobile && (
        <div className="sheet-time-panel-footer">
          <TimePanel
            atmosphereState={atmosphereState}
            currentHour={currentHour}
            subtitle={atmosphereState.name}
            isExploring={isExploring}
            isMobile
            onHourChange={onHourChange}
            onResetToNow={onResetToNow}
          />
        </div>
      )}
    </div>
  );
}
