import { useEffect, useMemo, useState } from 'react';
import { CURATED_VENUES } from '../data/curatedVenues';
import type { CityConfig } from '../data/cities';
import { fetchOSMVenues } from '../lib/osm';
import { applyVenueFilters } from '../lib/scoring';
import { atmosphere, mapboxSunDir } from '../lib/sun';
import { formatDateLabel, roundToQuarter } from '../lib/time';
import type { LoadingState, OSMStatus, ShadowStatus } from '../types/atmosphere';
import type { OutdoorSetting, ShadowScore, Venue, VenueCategory } from '../types/venue';

export const INITIAL_HOUR = roundToQuarter(new Date().getHours() + new Date().getMinutes() / 60);

export function usePatioAppState(city: CityConfig) {
  const [allVenues, setAllVenues] = useState<Venue[]>(city.slug === 'nyc' ? CURATED_VENUES : []);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<VenueCategory | 'all'>('all');
  const [selectedOutdoorSetting, setSelectedOutdoorSetting] = useState<OutdoorSetting | 'all'>('all');
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

    fetchOSMVenues(city)
      .then((venues) => {
        if (cancelled) return;
        setAllVenues(venues);
        setOsmStatus({ label: `${venues.length} venues loaded`, tone: 'success' });
      })
      .catch(() => {
        if (cancelled) return;
        if (city.slug === 'nyc') {
          setAllVenues(CURATED_VENUES);
          setOsmStatus({ label: `${CURATED_VENUES.length} curated venues`, tone: 'warning' });
        } else {
          setAllVenues([]);
          setOsmStatus({ label: 'Failed to load venues', tone: 'warning' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  const coords = useMemo(() => ({ lat: city.lat, lng: city.lng }), [city.lat, city.lng]);

  const neighborhoods = useMemo(() => {
    return [...new Set(allVenues.map((venue) => venue.hood).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [allVenues]);

  const categories = useMemo(() => {
    return [...new Set(allVenues.map((venue) => venue.category))].sort((a, b) => a.localeCompare(b));
  }, [allVenues]);

  const outdoorSettings = useMemo(() => {
    return [...new Set(allVenues.map((venue) => venue.outdoorSetting))].sort((a, b) => a.localeCompare(b));
  }, [allVenues]);

  const activeNeighborhood =
    selectedNeighborhood === 'all' || neighborhoods.includes(selectedNeighborhood)
      ? selectedNeighborhood
      : 'all';

  const activeCategory =
    selectedCategory === 'all' || categories.includes(selectedCategory) ? selectedCategory : 'all';
  const activeOutdoorSetting =
    selectedOutdoorSetting === 'all' || outdoorSettings.includes(selectedOutdoorSetting)
      ? selectedOutdoorSetting
      : 'all';

  const visibleVenues = useMemo(
    () =>
      applyVenueFilters(allVenues, {
        neighborhood: activeNeighborhood,
        category: activeCategory,
        outdoorSetting: activeOutdoorSetting,
      }),
    [activeCategory, activeNeighborhood, activeOutdoorSetting, allVenues]
  );

  const atmosphereState = useMemo(() => atmosphere(currentHour, coords), [currentHour, coords]);
  const sunDirection = useMemo(() => mapboxSunDir(currentHour, coords), [currentHour, coords]);

  return {
    allVenues,
    atmosphereState,
    categories,
    currentHour,
    dateLabel: formatDateLabel(city.shortName),
    loadingState,
    neighborhoods,
    outdoorSettings,
    osmStatus,
    selectedCategory: activeCategory,
    selectedNeighborhood: activeNeighborhood,
    selectedOutdoorSetting: activeOutdoorSetting,
    shadowScores,
    shadowStatus,
    sunDirection,
    visibleVenues,
    setSelectedCategory,
    setCurrentHour,
    setLoadingState,
    setOsmStatus,
    setSelectedNeighborhood,
    setSelectedOutdoorSetting,
    setShadowScores,
    setShadowStatus,
  };
}
