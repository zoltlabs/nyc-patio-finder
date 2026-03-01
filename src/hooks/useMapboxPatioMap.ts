import { useEffect, useEffectEvent, useMemo, useRef, useState, type RefObject } from 'react';
import mapboxgl, { type GeoJSONSource, type LightsSpecification, type Map, type Popup } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { scoreColor } from '../lib/colors';
import { buildGeoJSON, calcScore } from '../lib/scoring';
import { buildSunVisualState, mapboxSunDir, NYC } from '../lib/sun';
import { formatDisplayTime } from '../lib/time';
import { computeShadowScores, getShadowStatus, loadBuildingCache } from '../lib/shadows';
import type { AtmosphereState, LoadingState, ShadowStatus } from '../types/atmosphere';
import type { MapViewportBounds, SunVisualState, VenueFeatureProperties } from '../types/map';
import type { ShadowScore, Venue } from '../types/venue';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const EMPTY_SUN_VISUAL: SunVisualState = {
  opacity: 0,
  left: 0,
  top: 0,
  atmoStyle: {},
  coronaStyle: {},
  raysStyle: {},
  discStyle: {},
  flareStyle: {},
};

interface UseMapboxPatioMapArgs {
  allVenues: Venue[];
  atmosphereState: AtmosphereState;
  currentHour: number;
  displayedVenues: Venue[];
  mapContainerRef: RefObject<HTMLDivElement | null>;
  shadowScores: Record<string, ShadowScore>;
  visibleVenues: Venue[];
  onLoadingStateChange: (loadingState: LoadingState) => void;
  onShadowScoresChange: (scores: Record<string, ShadowScore>) => void;
  onShadowStatusChange: (status: ShadowStatus) => void;
  onViewportBoundsChange: (bounds: MapViewportBounds) => void;
}

function getViewportBounds(map: Map): MapViewportBounds {
  const bounds = map.getBounds();
  if (!bounds) {
    const center = map.getCenter();
    return {
      north: center.lat,
      south: center.lat,
      east: center.lng,
      west: center.lng,
    };
  }
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

function popupHTML(properties: VenueFeatureProperties, hour: number): string {
  const shadowLine = properties.reason
    ? `<div style="display:flex;align-items:center;gap:5px;margin-top:6px">
         <span style="font-size:10px;color:${properties.shaded ? '#88aaff' : '#ffcc44'}">${properties.geoVerified ? '🔬 ' : ''}${properties.reason}</span>
       </div>`
    : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="font-family: 'Charter', serif; font-size: 17px; font-weight: 500; margin-bottom: 4px; color: #fff;">${properties.name}</div>
      <div style="font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
        ${properties.hood} · ${properties.type}
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1;height:2px;background:rgba(255,255,255,0.1);border-radius:1px;overflow:hidden">
          <div style="width:${properties.score}%;height:100%;background:${properties.color};"></div>
        </div>
        <span style="font-family: -apple-system, sans-serif; font-weight: 900; font-size: 16px; color: ${properties.color}; letter-spacing: -0.5px;">${properties.score}</span>
      </div>
      ${shadowLine}
      <div style="font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 10px;">${formatDisplayTime(hour)}</div>
    </div>
  `;
}

export function useMapboxPatioMap({
  allVenues,
  atmosphereState,
  currentHour,
  displayedVenues,
  mapContainerRef,
  shadowScores,
  visibleVenues,
  onLoadingStateChange,
  onShadowScoresChange,
  onShadowStatusChange,
  onViewportBoundsChange,
}: UseMapboxPatioMapArgs) {
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const popupVenueIdRef = useRef<string | null>(null);
  const buildingCacheRef = useRef<ReturnType<typeof loadBuildingCache> | null>(null);
  const shadowDebounceRef = useRef<number | null>(null);
  const hideLoadingRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [sunVisual, setSunVisual] = useState<SunVisualState>(EMPTY_SUN_VISUAL);

  const latest = useRef({
    allVenues,
    atmosphereState,
    currentHour,
    displayedVenues,
    shadowScores,
    visibleVenues,
  });

  useEffect(() => {
    latest.current = { allVenues, atmosphereState, currentHour, displayedVenues, shadowScores, visibleVenues };
  }, [allVenues, atmosphereState, currentHour, displayedVenues, shadowScores, visibleVenues]);

  const refreshVenueSource = useEffectEvent(() => {
    const map = mapRef.current;
    const source = map?.getSource('venues') as GeoJSONSource | undefined;
    if (!source) return;
    source.setData(buildGeoJSON(latest.current.displayedVenues, latest.current.currentHour, latest.current.shadowScores));
  });

  const refreshOpenPopup = useEffectEvent(() => {
    const popup = popupRef.current;
    const venueId = popupVenueIdRef.current;
    if (!popup || !venueId) return;

    const venue = latest.current.allVenues.find((item) => item.id === venueId);
    if (!venue) return;

    const isVisible = latest.current.displayedVenues.some((item) => item.id === venueId);
    if (!isVisible) {
      popup.remove();
      popupRef.current = null;
      popupVenueIdRef.current = null;
      return;
    }

    const geo = latest.current.shadowScores[venue.id];
    const score = geo?.score ?? calcScore(venue, latest.current.currentHour);
    const color = scoreColor(score);

    popup.setHTML(
      popupHTML(
        {
          id: venue.id,
          name: venue.name,
          type: venue.type,
          hood: venue.hood || 'NYC',
          score,
          color,
          geoVerified: Boolean(geo?.geo),
          shaded: geo?.shaded ?? null,
          reason: geo?.reason ?? '',
        },
        latest.current.currentHour
      )
    );
  });

  const updateSunVisual = useEffectEvent(() => {
    const map = mapRef.current;
    if (!map) return;
    setSunVisual(buildSunVisualState(map, latest.current.currentHour));
  });

  const runShadowAnalysis = useEffectEvent((hour: number) => {
    const map = mapRef.current;
    if (!map) return;

    onShadowStatusChange({ state: 'computing', label: 'Computing shadows…' });

    let buildingCache = buildingCacheRef.current;
    if (!buildingCache?.length) {
      try {
        buildingCache = loadBuildingCache(map);
        buildingCacheRef.current = buildingCache;
      } catch {
        buildingCache = [];
      }
    }

    if (!buildingCache.length) {
      onShadowStatusChange({ state: 'unavailable', label: 'Directional scores (zoom in for geo)' });
      return;
    }

    const scores = computeShadowScores(latest.current.allVenues, hour, buildingCache);
    onShadowScoresChange(scores);

    const status = getShadowStatus(scores);
    onShadowStatusChange(
      status.state === 'active'
        ? { state: 'active', label: `🔬 Geo shadows · ${status.count} venues` }
        : { state: 'unavailable', label: 'Directional scores (zoom in for geo)' }
    );
  });

  const scheduleShadowAnalysis = useEffectEvent((hour: number) => {
    if (shadowDebounceRef.current) clearTimeout(shadowDebounceRef.current);
    shadowDebounceRef.current = window.setTimeout(() => runShadowAnalysis(hour), 700);
  });

  const applyScene = useEffectEvent((hour: number, nextAtmosphere: AtmosphereState) => {
    const map = mapRef.current;
    if (!map) return;

    const sun = mapboxSunDir(hour);

    try {
      map.setConfigProperty('basemap', 'lightPreset', nextAtmosphere.preset);
    } catch {
      // Mapbox standard config can reject this until style is fully ready.
    }

    const lights: LightsSpecification[] = [
      {
        id: 'environment',
        type: 'ambient',
        properties: { color: nextAtmosphere.ambC, intensity: nextAtmosphere.ambI },
      },
    ];

    if (nextAtmosphere.dirI > 0.01) {
      lights.push({
        id: 'sun',
        type: 'directional',
        properties: {
          color: nextAtmosphere.dirC,
          intensity: nextAtmosphere.dirI,
          direction: sun.dir,
          'cast-shadows': true,
          'shadow-intensity': Math.min(0.92, nextAtmosphere.dirI * 1.1),
        },
      });
    }

    try {
      map.setLights(lights);
    } catch {
      // Lighting is best-effort during style transitions.
    }

    try {
      map.setPaintProperty('sky', 'sky-atmosphere-sun', sun.dir);
      map.setPaintProperty('sky', 'sky-atmosphere-sun-intensity', nextAtmosphere.sunI || 0.5);
    } catch {
      // Sky layer may not be ready yet.
    }

    try {
      map.setFog({
        range: [1, 12],
        color: nextAtmosphere.fog,
        'high-color': nextAtmosphere.highFog,
        'space-color': nextAtmosphere.space,
        'horizon-blend': nextAtmosphere.horizon,
        'star-intensity': nextAtmosphere.stars,
      });
    } catch {
      // Fog can fail before style load; no-op.
    }

    refreshVenueSource();
    refreshOpenPopup();
    updateSunVisual();
    scheduleShadowAnalysis(hour);
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!MAPBOX_TOKEN) {
      onLoadingStateChange({ visible: true, tokenRequired: true });
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [NYC.lng, NYC.lat],
      zoom: 13.6,
      pitch: 58,
      bearing: -12,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    const onLoad = () => {
      map.addSource('venues', {
        type: 'geojson',
        data: buildGeoJSON(latest.current.displayedVenues, latest.current.currentHour, latest.current.shadowScores),
      });

      map.addLayer({
        id: 'venues-glow',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0, 10, 100, 28],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.2,
          'circle-blur': 1.9,
        },
      });

      map.addLayer({
        id: 'venues-main',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0, 5, 100, 14],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.92,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.45)',
        },
      });

      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0, 30],
          'sky-atmosphere-sun-intensity': 15,
          'sky-opacity': ['interpolate', ['exponential', 1.5], ['zoom'], 0, 0, 5, 0.3, 10, 1],
        },
      });

      map.on('click', 'venues-main', (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const properties = feature.properties as unknown as VenueFeatureProperties;
        const [lng, lat] = feature.geometry.coordinates as [number, number];

        popupRef.current?.remove();
        popupVenueIdRef.current = properties.id;
        popupRef.current = new mapboxgl.Popup({ offset: 16, closeButton: true })
          .setLngLat([lng, lat])
          .setHTML(popupHTML(properties, latest.current.currentHour))
          .on('close', () => {
            popupVenueIdRef.current = null;
            popupRef.current = null;
          })
          .addTo(map);
      });

      map.on('mouseenter', 'venues-main', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'venues-main', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('idle', () => {
        buildingCacheRef.current = null;
        scheduleShadowAnalysis(latest.current.currentHour);
      });

      map.on('moveend', () => {
        onViewportBoundsChange(getViewportBounds(map));
      });

      setMapReady(true);
      onViewportBoundsChange(getViewportBounds(map));
      applyScene(latest.current.currentHour, latest.current.atmosphereState);

      hideLoadingRef.current = window.setTimeout(() => {
        onLoadingStateChange({ visible: false, tokenRequired: false });
      }, 1400);
    };

    map.on('load', onLoad);
    map.on('move', updateSunVisual);
    map.on('error', (event) => {
      const error = event.error as Error & { status?: number };
      if (error?.status === 401 || error?.message?.includes('401')) {
        onLoadingStateChange({ visible: true, tokenRequired: true });
      }
    });

    return () => {
      if (shadowDebounceRef.current) clearTimeout(shadowDebounceRef.current);
      if (hideLoadingRef.current) clearTimeout(hideLoadingRef.current);
      popupRef.current?.remove();
      popupVenueIdRef.current = null;
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [mapContainerRef, onLoadingStateChange, onViewportBoundsChange]);

  useEffect(() => {
    refreshVenueSource();
  }, [shadowScores, visibleVenues, currentHour]);

  useEffect(() => {
    applyScene(currentHour, atmosphereState);
  }, [atmosphereState, currentHour]);

  const flyToVenue = useMemo(() => {
    return (lng: number, lat: number) => {
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: 16,
        pitch: 62,
        duration: 1400,
        essential: true,
      });
    };
  }, []);

  const fitToVenues = useMemo(() => {
    return () => {
      const map = mapRef.current;
      const venues = latest.current.displayedVenues;
      if (!map || venues.length === 0) return;

      if (venues.length === 1) {
        const [venue] = venues;
        if (!venue) return;
        map.flyTo({
          center: [venue.lng, venue.lat],
          zoom: 15.5,
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          duration: 900,
          essential: true,
        });
        return;
      }

      const bounds = new mapboxgl.LngLatBounds();
      venues.forEach((venue) => {
        bounds.extend([venue.lng, venue.lat]);
      });

      map.fitBounds(bounds, {
        padding: { top: 80, right: 80, bottom: 140, left: 360 },
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        duration: 1100,
        essential: true,
        maxZoom: 15.5,
      });
    };
  }, []);

  return {
    flyToVenue,
    fitToVenues,
    mapReady,
    sunVisual,
  };
}
