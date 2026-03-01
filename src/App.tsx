import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Legend } from './components/Legend';
import { LoadingOverlay } from './components/LoadingOverlay';
import { MapCanvas } from './components/MapCanvas';
import { Sidebar } from './components/Sidebar';
import { StatusBadge } from './components/StatusBadge';
import { SunOverlay } from './components/SunOverlay';
import { TimePanel } from './components/TimePanel';
import { useMapboxPatioMap } from './hooks/useMapboxPatioMap';
import { usePatioAppState } from './hooks/usePatioAppState';
import { roundToQuarter } from './lib/time';
import type { MapViewportBounds } from './types/map';
import { scoreVenues } from './lib/scoring';

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

export default function App() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const hourFrameRef = useRef<number | null>(null);
  const [stars] = useState(createStars);
  const [viewportOnly, setViewportOnly] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<MapViewportBounds | null>(null);

  const {
    allVenues,
    atmosphereState,
    currentHour,
    dateLabel,
    loadingState,
    neighborhoods,
    osmStatus,
    selectedNeighborhood,
    shadowScores,
    shadowStatus,
    sunDirection,
    visibleVenues,
    setCurrentHour,
    setLoadingState,
    setSelectedNeighborhood,
    setShadowScores,
    setShadowStatus,
  } = usePatioAppState();

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
        dateLabel={dateLabel}
        mapViewCount={venuesInViewport.length}
        neighborhoods={neighborhoods}
        onFitToVenues={fitToVenues}
        onNeighborhoodChange={setSelectedNeighborhood}
        onViewportToggle={setViewportOnly}
        onSelectVenue={flyToVenue}
        scoredVenues={scoredVenues}
        selectedNeighborhood={selectedNeighborhood}
        shadowStatus={shadowStatus}
        sunAltitude={sunDirection.altDeg}
        viewportOnly={viewportOnly}
      />
      <TimePanel 
        currentHour={currentHour} 
        subtitle={atmosphereState.name} 
        onHourChange={handleHourChange} 
        atmosphereState={atmosphereState}
      />
      <Legend />
      <StatusBadge status={osmStatus} />
    </>
  );
}
