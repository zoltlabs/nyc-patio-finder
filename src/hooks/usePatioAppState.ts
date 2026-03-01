import { useEffect, useMemo, useState } from 'react';
import { CURATED_VENUES } from '../data/curatedVenues';
import { fetchOSMVenues } from '../lib/osm';
import { filterVenuesByNeighborhood, scoreVenues } from '../lib/scoring';
import { atmosphere, mapboxSunDir } from '../lib/sun';
import { formatDateLabel, roundToQuarter } from '../lib/time';
import type { LoadingState, OSMStatus, ShadowStatus } from '../types/atmosphere';
import type { ShadowScore, Venue } from '../types/venue';

const INITIAL_HOUR = roundToQuarter(new Date().getHours() + new Date().getMinutes() / 60);

export function usePatioAppState() {
  const [allVenues, setAllVenues] = useState<Venue[]>(CURATED_VENUES);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('all');
  const [currentHour, setCurrentHour] = useState(INITIAL_HOUR);
  const [shadowScores, setShadowScores] = useState<Record<string, ShadowScore>>({});
  const [shadowStatus, setShadowStatus] = useState<ShadowStatus>({
    state: 'computing',
    label: 'Shadow analysis loading…',
  });
  const [loadingState, setLoadingState] = useState<LoadingState>({
    visible: true,
    tokenRequired: false,
  });
  const [osmStatus, setOsmStatus] = useState<OSMStatus>({
    label: 'Loading venues…',
    tone: 'loading',
  });

  useEffect(() => {
    let cancelled = false;

    fetchOSMVenues()
      .then((venues) => {
        if (cancelled) return;
        setAllVenues(venues);
        setOsmStatus({ label: `${venues.length} venues loaded`, tone: 'success' });
      })
      .catch(() => {
        if (cancelled) return;
        setAllVenues(CURATED_VENUES);
        setOsmStatus({ label: `${CURATED_VENUES.length} curated venues`, tone: 'warning' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const neighborhoods = useMemo(() => {
    return [...new Set(allVenues.map((venue) => venue.hood).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [allVenues]);

  const activeNeighborhood =
    selectedNeighborhood === 'all' || neighborhoods.includes(selectedNeighborhood)
      ? selectedNeighborhood
      : 'all';

  const visibleVenues = useMemo(
    () => filterVenuesByNeighborhood(allVenues, activeNeighborhood),
    [activeNeighborhood, allVenues]
  );

  const atmosphereState = useMemo(() => atmosphere(currentHour), [currentHour]);
  const sunDirection = useMemo(() => mapboxSunDir(currentHour), [currentHour]);
  const scoredVenues = useMemo(
    () => scoreVenues(visibleVenues, currentHour, shadowScores),
    [visibleVenues, currentHour, shadowScores]
  );

  return {
    allVenues,
    atmosphereState,
    currentHour,
    dateLabel: formatDateLabel(),
    loadingState,
    neighborhoods,
    osmStatus,
    scoredVenues,
    selectedNeighborhood: activeNeighborhood,
    shadowScores,
    shadowStatus,
    sunDirection,
    visibleVenues,
    setCurrentHour,
    setLoadingState,
    setOsmStatus,
    setSelectedNeighborhood,
    setShadowScores,
    setShadowStatus,
  };
}
