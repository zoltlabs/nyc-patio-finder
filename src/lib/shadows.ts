import type { BuildingFeature } from '../types/map';
import type { ShadowScore, Venue } from '../types/venue';
import type { Map } from 'mapbox-gl';
import { calcScore, scoreOpenSkyLocation } from './scoring';
import { mapboxSunDir, type Coords } from './sun';

interface PointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

interface PolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][];
}

interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

type SupportedGeometry = PointGeometry | PolygonGeometry | MultiPolygonGeometry;

function getFeatureProps(feature: BuildingFeature): Record<string, unknown> {
  return (feature.properties ?? {}) as Record<string, unknown>;
}

function getFeatureCenter(feature: BuildingFeature): { lat: number; lng: number } | null {
  const geometry = feature.geometry as SupportedGeometry | undefined;
  if (!geometry) return null;

  if (geometry.type === 'Point') {
    return { lat: geometry.coordinates[1], lng: geometry.coordinates[0] };
  }

  const ring =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0]?.[0]
        : null;

  if (!ring?.length) return null;

  return {
    lat: ring.reduce((sum, point) => sum + point[1], 0) / ring.length,
    lng: ring.reduce((sum, point) => sum + point[0], 0) / ring.length,
  };
}

export function loadBuildingCache(map: Map): BuildingFeature[] {
  const raw = map.querySourceFeatures('composite', { sourceLayer: 'building' }) as BuildingFeature[];
  const seen = new Set<string>();

  return raw.filter((feature) => {
    const props = getFeatureProps(feature);
    const height = Number(props.height ?? props.render_height ?? 0);
    if (height < 3 || props.underground === 'true') return false;

    const key = feature.id != null ? String(feature.id) : null;
    if (key) {
      if (seen.has(key)) return false;
      seen.add(key);
    }

    return true;
  });
}

function dirLabel(azDeg: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'][Math.round(azDeg / 45) % 8] ?? 'N';
}

export function computeGeometricShadow(
  venue: Venue,
  hour: number,
  buildingCache: BuildingFeature[],
  coords: Coords
): ShadowScore | null {
  if (!buildingCache.length) return null;

  const sun = mapboxSunDir(hour, coords);
  if (sun.altDeg <= 0) {
    return { score: 0, shaded: true, reason: 'Sun below horizon', geo: true };
  }

  const maxDist = venue.outdoorSetting === 'rooftop' ? 120 : 550;
  const tolerance = venue.outdoorSetting === 'rooftop' ? 40 : 30;
  const latMeters = 111320;
  const lngMeters = 111320 * Math.cos(venue.lat * Math.PI / 180);

  let best: { effBlock: number; dist: number; h: number } | null = null;

  for (const building of buildingCache) {
    const center = getFeatureCenter(building);
    if (!center) continue;

    const dLatM = (center.lat - venue.lat) * latMeters;
    const dLngM = (center.lng - venue.lng) * lngMeters;
    const dist = Math.sqrt(dLatM * dLatM + dLngM * dLngM);
    if (dist < 6 || dist > maxDist) continue;

    const bearDeg = (Math.atan2(dLngM, dLatM) * 180 / Math.PI + 360) % 360;
    let azDiff = Math.abs(bearDeg - sun.azDeg);
    if (azDiff > 180) azDiff = 360 - azDiff;
    if (azDiff > tolerance) continue;

    const props = getFeatureProps(building);
    const height = Number(props.height ?? props.render_height ?? 0);
    const rawBlock = Math.atan(height / dist) * 180 / Math.PI;
    const effBlock = rawBlock * Math.cos((azDiff / tolerance) * (Math.PI / 2));

    if (effBlock > sun.altDeg + 1 && (!best || effBlock > best.effBlock)) {
      best = { effBlock, dist, h: height };
    }
  }

  if (best) {
    const depth = Math.min(1, (best.effBlock - sun.altDeg) / 22);
    return {
      score: Math.max(3, Math.round((1 - depth * 0.93) * 38)),
      shaded: true,
      reason: `${Math.round(best.h)}m bldg ~${Math.round(best.dist)}m ${dirLabel(sun.azDeg)}`,
      geo: true,
    };
  }

  return {
    score: calcScore(venue, hour, coords),
    shaded: false,
    reason: `Clear · ${Math.round(sun.altDeg)}° sun`,
    geo: true,
  };
}

export function computeShadowScores(
  venues: Venue[],
  hour: number,
  buildingCache: BuildingFeature[],
  coords: Coords
): Record<string, ShadowScore> {
  const scores: Record<string, ShadowScore> = {};
  venues.forEach((venue) => {
    const result = computeGeometricShadow(venue, hour, buildingCache, coords);
    if (result) scores[venue.id] = result;
  });
  return scores;
}

export function computeLocationShadowScore(
  location: { lat: number; lng: number },
  hour: number,
  buildingCache: BuildingFeature[],
  coords: Coords
): ShadowScore {
  const result = computeGeometricShadow(
    {
      id: 'destination',
      name: 'Selected address',
      category: 'cafe',
      outdoorSetting: 'patio',
      lat: location.lat,
      lng: location.lng,
      hood: 'Selected address',
      facing: 'all',
    },
    hour,
    buildingCache,
    coords
  );

  return result ?? scoreOpenSkyLocation(hour, coords);
}

export function getShadowStatus(scores: Record<string, ShadowScore>): { state: 'active' | 'unavailable'; count: number } {
  const geoCount = Object.values(scores).filter((score) => score.geo).length;
  return geoCount > 0 ? { state: 'active', count: geoCount } : { state: 'unavailable', count: 0 };
}
