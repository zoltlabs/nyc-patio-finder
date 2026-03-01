import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
import { computeSunUntil, scoreVenues } from './lib/scoring';
import { shareVenue } from './lib/share';
import { roundToQuarter } from './lib/time';
import type { MapViewportBounds } from './types/map';
import type { VenueWithScore } from './types/venue';

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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const hourFrameRef = useRef<number | null>(null);
  const initialFlyDoneRef = useRef(false);
  const [stars] = useState(createStars);
  const [viewportOnly, setViewportOnly] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<MapViewportBounds | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isMobile = useIsMobile();

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
  } = usePatioAppState();

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
  const scoredVenues = scoreVenues(listedVenues, currentHour, shadowScores);

  const { fitToVenues, flyToVenue, sunVisual } = useMapboxPatioMap({
    allVenues,
    atmosphereState,
    currentHour,
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

  const handleShare = async (venue: VenueWithScore) => {
    const sunUntil = computeSunUntil(venue, currentHour, shadowScores);
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
  const sunUntil = topVenue ? computeSunUntil(topVenue, currentHour, shadowScores) : null;

  return (
    <>
      <LoadingOverlay loadingState={loadingState} />
      <div id="gh-glow" style={{ opacity: atmosphereState.gh }} />
      <div id="stars-overlay" style={{ opacity: atmosphereState.stars > 0.3 ? atmosphereState.stars * 0.6 : 0 }}>
        {stars.map((star) => (
          <div key={star.id} className="star" style={star.style} />
        ))}
      </div>
      <SunOverlay sunVisual={sunVisual} />
      <MapCanvas mapRef={mapContainerRef} />
      <Sidebar
        atmosphereState={atmosphereState}
        categories={categories}
        currentHour={currentHour}
        dateLabel={dateLabel}
        isExploring={isExploring}
        isMobile={isMobile}
        sheetExpanded={sheetExpanded}
        neighborhoods={neighborhoods}
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
        selectedCategory={selectedCategory}
        selectedNeighborhood={selectedNeighborhood}
        selectedOutdoorSetting={selectedOutdoorSetting}
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
