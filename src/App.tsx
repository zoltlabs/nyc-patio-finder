import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { getCityBySlug, DEFAULT_CITY, type CityConfig } from './data/cities';
import { Legend } from './components/Legend';
import { LoadingOverlay } from './components/LoadingOverlay';
import { MapCanvas } from './components/MapCanvas';
import { Sidebar } from './components/Sidebar';
import { StatusBadge } from './components/StatusBadge';
import { SunOverlay } from './components/SunOverlay';
import { TimePanel } from './components/TimePanel';
import { Toast } from './components/Toast';
import { useIsMobile } from './hooks/useIsMobile';
import { useMapboxPatioMap } from './hooks/useMapboxPatioMap';
import { usePatioAppState, INITIAL_HOUR } from './hooks/usePatioAppState';
import { geocodeAddress } from './lib/geocoding';
import { computeSunUntil, describeTimeWindow, scoreVenues } from './lib/scoring';
import { shareVenue } from './lib/share';
import { roundToQuarter } from './lib/time';
import type { AddressResult } from './types/location';
import type { MapViewportBounds } from './types/map';
import type { SunSearchCustomRange, SunSearchMode, SunSearchWindowPreset, VenueWithScore } from './types/venue';

function createStars() {
  return Array.from({ length: 90 }, (_, index) => {
    const size = Math.random() * 2.5 + 0.5;
    return {
      id: index,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 65}%`,
        ['--dur' as const]: `${(2 + Math.random() * 3).toFixed(1)}s`,
        ['--del' as const]: `${(Math.random() * 4).toFixed(1)}s`,
      } as CSSProperties,
    };
  });
}

function getCityFromURL(): CityConfig {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  return getCityBySlug(path || DEFAULT_CITY);
}

// Read URL params once on load
const urlParams = new URLSearchParams(window.location.search);
const URL_VENUE_ID = urlParams.get('v') ?? null;
const URL_HOUR = (() => {
  const h = urlParams.get('h');
  if (!h) return null;
  const parsed = parseFloat(h);
  return Number.isFinite(parsed) ? roundToQuarter(Math.max(0, Math.min(23, parsed))) : null;
})();

export default function App() {
  const addressLookupIdRef = useRef(0);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const hourFrameRef = useRef<number | null>(null);
  const initialFlyDoneRef = useRef(false);
  const [stars] = useState(createStars);
  const [city, setCity] = useState<CityConfig>(getCityFromURL);
  const [selectedAddress, setSelectedAddress] = useState<AddressResult | null>(null);
  const [addressLookupPending, setAddressLookupPending] = useState(false);
  const [addressLookupError, setAddressLookupError] = useState<string | null>(null);
  const [viewportOnly, setViewportOnly] = useState(false);
  const [searchWindowPreset, setSearchWindowPreset] = useState<SunSearchWindowPreset>('now');
  const [searchMode, setSearchMode] = useState<SunSearchMode>('total-sun');
  const [customRange, setCustomRange] = useState<SunSearchCustomRange>({
    startHour: INITIAL_HOUR,
    endHour: Math.min(23, roundToQuarter(INITIAL_HOUR + 2)),
  });
  const [viewportBounds, setViewportBounds] = useState<MapViewportBounds | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isMobile = useIsMobile();

  const coords = { lat: city.lat, lng: city.lng };

  const handleCityChange = useCallback((slug: string) => {
    const newCity = getCityBySlug(slug);
    setCity(newCity);
    setSelectedAddress(null);
    setAddressLookupError(null);
    setAddressLookupPending(false);
    const newPath = newCity.slug === DEFAULT_CITY ? '/' : `/${newCity.slug}`;
    window.history.pushState(null, '', newPath);
    document.title = `${newCity.shortName} Patio Finder — Daylight Maxxing`;
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      setCity(getCityFromURL());
      setSelectedAddress(null);
      setAddressLookupError(null);
      setAddressLookupPending(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Set document title on mount and city change
  useEffect(() => {
    document.title = `${city.shortName} Patio Finder — Daylight Maxxing`;
  }, [city.shortName]);

  const {
    allVenues,
    atmosphereState,
    categories,
    currentHour,
    dateLabel,
    loadingState,
    neighborhoods,
    outdoorSettings,
    osmStatus,
    selectedCategory,
    selectedNeighborhood,
    selectedOutdoorSetting,
    shadowScores,
    shadowStatus,
    sunDirection,
    visibleVenues,
    setSelectedCategory,
    setCurrentHour,
    setLoadingState,
    setSelectedNeighborhood,
    setSelectedOutdoorSetting,
    setShadowScores,
    setShadowStatus,
  } = usePatioAppState(city);

  // Apply URL hour param on mount
  useEffect(() => {
    if (URL_HOUR !== null) {
      setCurrentHour(URL_HOUR);
    }
  }, [setCurrentHour]);

  const isExploring = currentHour !== INITIAL_HOUR;

  const venuesInViewport = viewportBounds
    ? visibleVenues.filter((venue) => {
        const withinLat = venue.lat >= viewportBounds.south && venue.lat <= viewportBounds.north;
        const withinLng =
          viewportBounds.west <= viewportBounds.east
            ? venue.lng >= viewportBounds.west && venue.lng <= viewportBounds.east
            : venue.lng >= viewportBounds.west || venue.lng <= viewportBounds.east;
        return withinLat && withinLng;
      })
    : visibleVenues;

  const listedVenues = viewportOnly ? venuesInViewport : visibleVenues;
  const scoredVenues = scoreVenues(listedVenues, {
    currentHour,
    shadowScores,
    coords,
    windowPreset: searchWindowPreset,
    rankingMode: searchMode,
    customRange,
  });
  const searchWindow = describeTimeWindow(searchWindowPreset, currentHour, coords, customRange);
  const isWindowSearch = searchWindowPreset !== 'now';

  const handleCustomRangeChange = useCallback((nextRange: SunSearchCustomRange) => {
    setCustomRange((current) => {
      const startHour = roundToQuarter(Math.max(0, Math.min(23, nextRange.startHour)));
      const proposedEndHour = roundToQuarter(Math.max(0, Math.min(23, nextRange.endHour)));
      const endHour = Math.max(startHour, proposedEndHour);

      if (current.startHour === startHour && current.endHour === endHour) return current;
      return { startHour, endHour };
    });
  }, []);

  const handleSearchWindowPresetChange = useCallback(
    (nextPreset: SunSearchWindowPreset) => {
      if (nextPreset === 'custom' && searchWindowPreset !== 'custom') {
        setCustomRange({
          startHour: currentHour,
          endHour: Math.min(23, roundToQuarter(currentHour + 2)),
        });
      }
      setSearchWindowPreset(nextPreset);
    },
    [currentHour, searchWindowPreset]
  );

  const { destinationSunlight, fitToVenues, flyToVenue, mapReady, sunVisual } = useMapboxPatioMap({
    allVenues,
    atmosphereState,
    city,
    currentHour,
    destinationLocation: selectedAddress,
    displayedVenues: listedVenues,
    mapContainerRef,
    shadowScores,
    visibleVenues,
    onLoadingStateChange: setLoadingState,
    onShadowScoresChange: setShadowScores,
    onShadowStatusChange: setShadowStatus,
    onViewportBoundsChange: setViewportBounds,
  });

  // Fly to URL venue after map loads
  useEffect(() => {
    if (!loadingState.visible && URL_VENUE_ID && !initialFlyDoneRef.current) {
      initialFlyDoneRef.current = true;
      const venue = allVenues.find((v) => v.id === URL_VENUE_ID);
      if (venue) flyToVenue(venue.lng, venue.lat);
    }
  }, [loadingState.visible, allVenues, flyToVenue]);

  useEffect(() => {
    if (!mapReady || !selectedAddress) return;
    flyToVenue(selectedAddress.lng, selectedAddress.lat);
  }, [flyToVenue, mapReady, selectedAddress]);

  useEffect(() => {
    return () => {
      if (hourFrameRef.current) cancelAnimationFrame(hourFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      setCurrentHour((prev) => {
        const next = event.key === 'ArrowRight' ? prev + 0.25 : prev - 0.25;
        return roundToQuarter(Math.max(0, Math.min(23, next)));
      });
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setCurrentHour]);

  const handleHourChange = (hour: number) => {
    if (hourFrameRef.current) cancelAnimationFrame(hourFrameRef.current);
    hourFrameRef.current = requestAnimationFrame(() => {
      setCurrentHour(hour);
      hourFrameRef.current = null;
    });
  };

  const handleResetToNow = () => {
    setCurrentHour(INITIAL_HOUR);
  };

  const handleAddressSearch = useCallback(
    async (query: string) => {
      const lookupId = ++addressLookupIdRef.current;
      setAddressLookupPending(true);
      setAddressLookupError(null);

      try {
        const match = await geocodeAddress(query, city);
        if (lookupId !== addressLookupIdRef.current) return;

        if (!match) {
          setSelectedAddress(null);
          setAddressLookupError(`No address match found in ${city.shortName}.`);
          return;
        }

        setSelectedAddress(match);
        setSheetExpanded(true);
        flyToVenue(match.lng, match.lat);
      } catch {
        if (lookupId !== addressLookupIdRef.current) return;
        setSelectedAddress(null);
        setAddressLookupError('Address lookup failed.');
      } finally {
        if (lookupId === addressLookupIdRef.current) {
          setAddressLookupPending(false);
        }
      }
    },
    [city, flyToVenue]
  );

  const handleAddressSelect = useCallback(
    (address: AddressResult) => {
      setAddressLookupPending(false);
      setAddressLookupError(null);
      setSelectedAddress(address);
      setSheetExpanded(true);
      flyToVenue(address.lng, address.lat);
    },
    [flyToVenue]
  );

  const handleShare = async (venue: VenueWithScore) => {
    const sunUntil = computeSunUntil(venue, currentHour, shadowScores, coords);
    try {
      const result = await shareVenue(venue, currentHour, sunUntil);
      if (result === 'clipboard') {
        setToastMessage('Link copied!');
        setToastVisible(true);
      }
    } catch {
      // User cancelled native share or clipboard failed
    }
  };

  const topVenue = scoredVenues[0] ?? null;
  const sunUntil = topVenue
    ? isWindowSearch
      ? topVenue.windowMetrics?.nextShadeHour ?? null
      : computeSunUntil(topVenue, currentHour, shadowScores, coords)
    : null;

  return (
    <>
      <LoadingOverlay loadingState={loadingState} cityShortName={city.shortName} />
      <div id="gh-glow" style={{ opacity: atmosphereState.gh }} />
      <div id="stars-overlay" style={{ opacity: atmosphereState.stars > 0.3 ? atmosphereState.stars * 0.6 : 0 }}>
        {stars.map((star) => (
          <div key={star.id} className="star" style={star.style} />
        ))}
      </div>
      <SunOverlay sunVisual={sunVisual} />
      <MapCanvas mapRef={mapContainerRef} />
      <Sidebar
        addressLookupError={addressLookupError}
        addressLookupPending={addressLookupPending}
        atmosphereState={atmosphereState}
        categories={categories}
        city={city}
        currentHour={currentHour}
        dateLabel={dateLabel}
        destinationSunlight={destinationSunlight}
        isExploring={isExploring}
        isMobile={isMobile}
        sheetExpanded={sheetExpanded}
        neighborhoods={neighborhoods}
        onAddressSearch={handleAddressSearch}
        onAddressSelect={handleAddressSelect}
        onCityChange={handleCityChange}
        onClearAddress={() => {
          setSelectedAddress(null);
          setAddressLookupError(null);
        }}
        customRange={customRange}
        onCustomRangeChange={handleCustomRangeChange}
        onSearchModeChange={setSearchMode}
        onSearchWindowPresetChange={handleSearchWindowPresetChange}
        onFitToVenues={fitToVenues}
        onCategoryChange={setSelectedCategory}
        onNeighborhoodChange={setSelectedNeighborhood}
        onOutdoorSettingChange={setSelectedOutdoorSetting}
        onViewportToggle={setViewportOnly}
        onSelectVenue={flyToVenue}
        onShare={handleShare}
        onHourChange={handleHourChange}
        onResetToNow={handleResetToNow}
        onToggleSheet={() => setSheetExpanded((e) => !e)}
        outdoorSettings={outdoorSettings}
        scoredVenues={scoredVenues}
        selectedAddress={selectedAddress}
        selectedCategory={selectedCategory}
        selectedNeighborhood={selectedNeighborhood}
        selectedOutdoorSetting={selectedOutdoorSetting}
        searchMode={searchMode}
        searchWindowLabel={searchWindow.label}
        searchWindowPreset={searchWindowPreset}
        shadowStatus={shadowStatus}
        sunAltitude={sunDirection.altDeg}
        sunUntil={sunUntil}
        viewportOnly={viewportOnly}
        mapViewCount={venuesInViewport.length}
      />
      {!isMobile && (
        <TimePanel
          currentHour={currentHour}
          subtitle={atmosphereState.name}
          isExploring={isExploring}
          onHourChange={handleHourChange}
          onResetToNow={handleResetToNow}
          atmosphereState={atmosphereState}
        />
      )}
      <Legend />
      <StatusBadge status={osmStatus} />
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />
    </>
  );
}
