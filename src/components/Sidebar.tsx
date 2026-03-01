import { useEffect, useRef, useState } from 'react';
import type { CityConfig } from '../data/cities';
import { fetchAddressSuggestions } from '../lib/geocoding';
import { formatDisplayTime } from '../lib/time';
import type { AddressResult } from '../types/location';
import type { AtmosphereState, ShadowStatus as ShadowStatusData } from '../types/atmosphere';
import type {
  OutdoorSetting,
  ShadowScore,
  SunSearchCustomRange,
  SunSearchMode,
  SunSearchWindowPreset,
  VenueCategory,
  VenueWithScore,
} from '../types/venue';
import { CategoryFilter } from './CategoryFilter';
import { CitySelector } from './CitySelector';
import { NeighborhoodFilter } from './NeighborhoodFilter';
import { NowBanner } from './NowBanner';
import { OutdoorSettingFilter } from './OutdoorSettingFilter';
import { ShadowStatus } from './ShadowStatus';
import { TimePanel } from './TimePanel';
import { VenueList } from './VenueList';

const WINDOW_OPTIONS: Array<{ value: SunSearchWindowPreset; label: string }> = [
  { value: 'now', label: 'Right now' },
  { value: '1h', label: 'Next 1 hour' },
  { value: '2h', label: 'Next 2 hours' },
  { value: '4h', label: 'Next 4 hours' },
  { value: '6h', label: 'Next 6 hours' },
  { value: 'until-sunset', label: 'Until sunset' },
  { value: 'custom', label: 'Custom range' },
];

const MODE_OPTIONS: Array<{ value: SunSearchMode; label: string }> = [
  { value: 'total-sun', label: 'Most total sun' },
  { value: 'continuous-sun', label: 'Longest continuous sun' },
  { value: 'sunny-right-away', label: 'Sunny right away' },
];

const CUSTOM_TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hour = index / 4;
  return {
    value: hour,
    label: formatDisplayTime(hour),
  };
});

function getPlaceLabel(category: VenueCategory | 'all') {
  switch (category) {
    case 'bar':
      return 'Bars';
    case 'restaurant':
      return 'Restaurants';
    case 'cafe':
      return 'Cafes';
    case 'brewery':
      return 'Breweries';
    default:
      return 'Spots';
  }
}

function buildListTitle(category: VenueCategory | 'all', searchWindowLabel: string) {
  const placeLabel = getPlaceLabel(category);
  if (searchWindowLabel === 'Right Now') return `Best Sunny ${placeLabel} Right Now`;
  return `Best Sunny ${placeLabel} For ${searchWindowLabel}`;
}

interface SidebarProps {
  addressLookupError: string | null;
  addressLookupPending: boolean;
  atmosphereState: AtmosphereState;
  categories: VenueCategory[];
  city: CityConfig;
  currentHour: number;
  customRange: SunSearchCustomRange;
  dateLabel: string;
  destinationSunlight: ShadowScore | null;
  isExploring: boolean;
  isMobile: boolean;
  sheetExpanded: boolean;
  neighborhoods: string[];
  onAddressSearch: (query: string) => void;
  onAddressSelect: (address: AddressResult) => void;
  onCityChange: (slug: string) => void;
  onClearAddress: () => void;
  onCustomRangeChange: (range: SunSearchCustomRange) => void;
  onSearchModeChange: (value: SunSearchMode) => void;
  onSearchWindowPresetChange: (value: SunSearchWindowPreset) => void;
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
  selectedAddress: AddressResult | null;
  selectedCategory: VenueCategory | 'all';
  selectedNeighborhood: string;
  selectedOutdoorSetting: OutdoorSetting | 'all';
  searchMode: SunSearchMode;
  searchWindowLabel: string;
  searchWindowPreset: SunSearchWindowPreset;
  shadowStatus: ShadowStatusData;
  sunAltitude: number;
  sunUntil: number | null;
  viewportOnly: boolean;
}

export function Sidebar({
  addressLookupError,
  addressLookupPending,
  atmosphereState,
  categories,
  city,
  currentHour,
  customRange,
  dateLabel,
  destinationSunlight,
  isExploring,
  isMobile,
  sheetExpanded,
  neighborhoods,
  onAddressSearch,
  onAddressSelect,
  onCityChange,
  onClearAddress,
  onCustomRangeChange,
  onSearchModeChange,
  onSearchWindowPresetChange,
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
  selectedAddress,
  selectedCategory,
  selectedNeighborhood,
  selectedOutdoorSetting,
  searchMode,
  searchWindowLabel,
  searchWindowPreset,
  shadowStatus,
  sunAltitude,
  sunUntil,
  viewportOnly,
}: SidebarProps) {
  const addressSearchIdRef = useRef(0);
  const addressPanelRef = useRef<HTMLDivElement | null>(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressResult[]>([]);
  const [addressSuggestionsOpen, setAddressSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] = useState(false);
  const pct = Math.max(0, Math.min(100, (sunAltitude / 62) * 100));
  const topVenue = scoredVenues[0] ?? null;
  const destinationScoreColor = destinationSunlight?.shaded ? '#88aaff' : atmosphereState.nameC;
  const listTitle = buildListTitle(selectedCategory, searchWindowLabel);
  const topRecommendationLabel =
    searchWindowPreset === 'now' ? 'Top recommendation right now' : `Top recommendation for ${searchWindowLabel.toLowerCase()}`;
  const topRecommendationStatus =
    searchWindowPreset === 'now'
      ? undefined
      : topVenue?.windowMetrics?.explanation ?? `Best fit for ${searchWindowLabel.toLowerCase()}`;
  const noResultsMessage = viewportOnly
    ? 'No venues match this search in the current map area. Try widening the map area or place type.'
    : 'No venues match this search. Try broadening the area or place type.';
  const isCustomRange = searchWindowPreset === 'custom';

  useEffect(() => {
    const trimmed = addressQuery.trim();
    if (trimmed.length < 3) return;

    const currentSearchId = ++addressSearchIdRef.current;

    const timeoutId = window.setTimeout(() => {
      fetchAddressSuggestions(trimmed, city)
        .then((results) => {
          if (currentSearchId !== addressSearchIdRef.current) return;
          setAddressSuggestions(results);
          setAddressSuggestionsOpen(true);
          setActiveSuggestionIndex(results.length > 0 ? 0 : -1);
        })
        .catch(() => {
          if (currentSearchId !== addressSearchIdRef.current) return;
          setAddressSuggestions([]);
          setAddressSuggestionsOpen(true);
          setActiveSuggestionIndex(-1);
        })
        .finally(() => {
          if (currentSearchId === addressSearchIdRef.current) {
            setAddressSuggestionsLoading(false);
          }
        });
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [addressQuery, city]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!addressPanelRef.current?.contains(event.target as Node)) {
        setAddressSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const hasAddressSuggestions = addressSuggestions.length > 0;

  const selectAddressSuggestion = (address: AddressResult) => {
    setAddressQuery(address.label);
    setAddressSuggestions([]);
    setAddressSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    onAddressSelect(address);
  };

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
          <CitySelector currentSlug={city.slug} onChange={onCityChange} />
          <div id="sidebar-title">
            <strong>{city.shortName}</strong> <span>Patio Finder</span>
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
        heading={topRecommendationLabel}
        statusOverride={topRecommendationStatus}
        sunUntil={sunUntil}
        periodColor={atmosphereState.nameC}
        onSelectVenue={onSelectVenue}
      />

      {(!isMobile || sheetExpanded) && (
        <>
          <div className="address-panel" ref={addressPanelRef}>
            <div className="caps">Go To Address</div>
            <form
              className="address-search"
              onSubmit={(event) => {
                event.preventDefault();
                if (activeSuggestionIndex >= 0 && addressSuggestions[activeSuggestionIndex]) {
                  selectAddressSuggestion(addressSuggestions[activeSuggestionIndex]!);
                  return;
                }
                onAddressSearch(addressQuery);
                setAddressSuggestionsOpen(false);
              }}
            >
              <input
                id="address-search"
                type="text"
                value={addressQuery}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setAddressQuery(nextQuery);
                  if (nextQuery.trim().length >= 3) {
                    setAddressSuggestionsLoading(true);
                  } else {
                    setAddressSuggestions([]);
                    setAddressSuggestionsLoading(false);
                    setAddressSuggestionsOpen(false);
                    setActiveSuggestionIndex(-1);
                  }
                }}
                onFocus={() => {
                  if (addressSuggestions.length > 0 || addressSuggestionsLoading) {
                    setAddressSuggestionsOpen(true);
                  }
                }}
                onKeyDown={(event) => {
                  if (!addressSuggestionsOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                    setAddressSuggestionsOpen(true);
                  }

                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveSuggestionIndex((current) =>
                      addressSuggestions.length === 0 ? -1 : Math.min(current + 1, addressSuggestions.length - 1)
                    );
                  }

                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveSuggestionIndex((current) => Math.max(current - 1, 0));
                  }

                  if (event.key === 'Escape') {
                    setAddressSuggestionsOpen(false);
                    setActiveSuggestionIndex(-1);
                  }
                }}
                placeholder={`Street address in ${city.shortName}`}
                autoComplete="street-address"
                aria-autocomplete="list"
                aria-controls="address-suggestion-list"
                aria-expanded={addressSuggestionsOpen}
              />
              <button type="submit" disabled={addressLookupPending || !addressQuery.trim()}>
                {addressLookupPending ? 'Finding…' : 'Go'}
              </button>
            </form>
            {addressSuggestionsOpen && (addressSuggestionsLoading || hasAddressSuggestions || addressQuery.trim().length >= 3) && (
              <div className="address-suggestions" id="address-suggestion-list" role="listbox">
                {addressSuggestionsLoading && <div className="address-suggestion-empty">Searching…</div>}
                {!addressSuggestionsLoading &&
                  addressSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.label}-${suggestion.lat}-${suggestion.lng}`}
                      type="button"
                      className={`address-suggestion${index === activeSuggestionIndex ? ' active' : ''}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectAddressSuggestion(suggestion);
                      }}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      role="option"
                      aria-selected={index === activeSuggestionIndex}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                {!addressSuggestionsLoading && !hasAddressSuggestions && (
                  <div className="address-suggestion-empty">No matching addresses in {city.shortName}.</div>
                )}
              </div>
            )}
            {addressLookupError && <div className="address-feedback">{addressLookupError}</div>}
            {selectedAddress && (
              <div className="address-result">
                <div className="address-result-head">
                  <div className="address-result-label">{selectedAddress.label}</div>
                  <button
                    type="button"
                    className="address-clear"
                    onClick={() => {
                      setAddressQuery('');
                      onClearAddress();
                    }}
                  >
                    Clear
                  </button>
                </div>
                {destinationSunlight && (
                  <>
                    <div className="address-result-score">
                      <span className={`vi-badge ${destinationSunlight.shaded ? 'shade-badge' : 'sun-badge'}`}>
                        {destinationSunlight.shaded ? 'Shaded' : 'Sunny'}
                      </span>
                      <strong style={{ color: destinationScoreColor }}>{destinationSunlight.score}</strong>
                      <span className="address-result-time">{formatDisplayTime(currentHour)}</span>
                    </div>
                    <div className="address-result-meta">{destinationSunlight.reason}</div>
                    {!destinationSunlight.geo && (
                      <div className="address-result-note">Clear-sky estimate until 3D building data is available.</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <NeighborhoodFilter
            neighborhoods={neighborhoods}
            selectedNeighborhood={selectedNeighborhood}
            onChange={onNeighborhoodChange}
          />

          <div className="sun-search-panel">
            <div className="caps">Sun Search</div>

            <label id="viewport-filter">
              <input
                type="checkbox"
                checked={viewportOnly}
                onChange={(event) => onViewportToggle(event.target.checked)}
              />
              <span>Search this map area</span>
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

            <div className="filter-group">
              <div className="caps">When</div>
              <select
                id="time-window-filter"
                value={searchWindowPreset}
                onChange={(event) => onSearchWindowPresetChange(event.target.value as SunSearchWindowPreset)}
              >
                {WINDOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {isCustomRange ? (
              <div className="custom-range-grid">
                <div className="filter-group">
                  <label htmlFor="custom-start-hour">Start time</label>
                  <select
                    id="custom-start-hour"
                    value={customRange.startHour}
                    onChange={(event) =>
                      onCustomRangeChange({
                        startHour: Number(event.target.value),
                        endHour: Math.max(Number(event.target.value), customRange.endHour),
                      })
                    }
                  >
                    {CUSTOM_TIME_OPTIONS.map((option) => (
                      <option key={`start-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="custom-end-hour">End time</label>
                  <select
                    id="custom-end-hour"
                    value={customRange.endHour}
                    onChange={(event) =>
                      onCustomRangeChange({
                        startHour: customRange.startHour,
                        endHour: Number(event.target.value),
                      })
                    }
                  >
                    {CUSTOM_TIME_OPTIONS.filter((option) => option.value >= customRange.startHour).map((option) => (
                      <option key={`end-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <div className="filter-group">
              <div className="caps">Optimize For</div>
              <select
                id="ranking-mode-filter"
                value={searchMode}
                onChange={(event) => onSearchModeChange(event.target.value as SunSearchMode)}
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
            {listTitle}
          </div>
        </>
      )}

      <VenueList venues={scoredVenues} onSelect={onSelectVenue} onShare={onShare} emptyMessage={noResultsMessage} />

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
