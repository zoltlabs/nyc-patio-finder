import type { OutdoorSetting, ShadowScore, Venue, VenueCategory, VenueWithScore } from '../types/venue';
import type { VenueFeatureCollection } from '../types/map';
import { scoreColor } from './colors';
import { sunPos } from './sun';

const FACE_DEG: Record<Venue['facing'], number | null> = {
  all: null,
  north: 0,
  northeast: 45,
  east: 90,
  southeast: 135,
  south: 180,
  southwest: 225,
  west: 270,
  northwest: 315,
};

export function filterVenuesByNeighborhood(venues: Venue[], selectedNeighborhood: string): Venue[] {
  return selectedNeighborhood === 'all'
    ? venues
    : venues.filter((venue) => venue.hood === selectedNeighborhood);
}

export function filterVenuesByCategory(venues: Venue[], selectedCategory: VenueCategory | 'all'): Venue[] {
  return selectedCategory === 'all' ? venues : venues.filter((venue) => venue.category === selectedCategory);
}

export function filterVenuesByOutdoorSetting(
  venues: Venue[],
  selectedOutdoorSetting: OutdoorSetting | 'all'
): Venue[] {
  return selectedOutdoorSetting === 'all'
    ? venues
    : venues.filter((venue) => venue.outdoorSetting === selectedOutdoorSetting);
}

export function applyVenueFilters(
  venues: Venue[],
  filters: {
    neighborhood: string;
    category: VenueCategory | 'all';
    outdoorSetting: OutdoorSetting | 'all';
  }
): Venue[] {
  return filterVenuesByOutdoorSetting(
    filterVenuesByCategory(filterVenuesByNeighborhood(venues, filters.neighborhood), filters.category),
    filters.outdoorSetting
  );
}

export function calcScore(venue: Venue, hour: number): number {
  const position = sunPos(hour);
  if (position.altitude <= 0) return 0;
  const altDeg = position.altitude * (180 / Math.PI);

  if (venue.outdoorSetting === 'rooftop' || venue.facing === 'all') {
    return Math.min(100, Math.round(altDeg <= 50 ? (altDeg / 50) * 100 : 100 - ((altDeg - 50) / 40) * 12));
  }

  const sunAz = ((position.azimuth + Math.PI) * (180 / Math.PI) + 360) % 360;
  const patioAz = FACE_DEG[venue.facing] ?? 180;
  let diff = Math.abs(sunAz - patioAz);
  if (diff > 180) diff = 360 - diff;
  return Math.round((Math.max(0, 1 - diff / 90) * 0.75 + Math.min(1, altDeg / 50) * 0.25) * 100);
}

export function scoreVenues(venues: Venue[], hour: number, shadowScores: Record<string, ShadowScore>): VenueWithScore[] {
  return venues
    .map((venue) => {
      const geo = shadowScores[venue.id];
      const score = geo?.score ?? calcScore(venue, hour);
      return { ...venue, score, geo };
    })
    .sort((a, b) => b.score - a.score);
}

export function computeSunUntil(
  venue: Venue,
  fromHour: number,
  shadowScores: Record<string, ShadowScore>
): number | null {
  const geo = shadowScores[venue.id];
  const currentScore = geo?.score ?? calcScore(venue, fromHour);
  if (currentScore < 40) return null;

  for (let h = fromHour + 0.25; h <= 23; h = Math.round((h + 0.25) * 4) / 4) {
    if (calcScore(venue, h) < 40) return h;
  }
  return null;
}

export function buildGeoJSON(
  venues: Venue[],
  hour: number,
  shadowScores: Record<string, ShadowScore>
): VenueFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((venue) => {
      const geo = shadowScores[venue.id];
      const score = geo?.score ?? calcScore(venue, hour);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [venue.lng, venue.lat],
        },
        properties: {
          id: venue.id,
          name: venue.name,
          category: venue.category,
          outdoorSetting: venue.outdoorSetting,
          hood: venue.hood || 'NYC',
          score,
          color: scoreColor(score),
          geoVerified: Boolean(geo?.geo),
          shaded: geo?.shaded ?? null,
          reason: geo?.reason ?? '',
        },
      };
    }),
  };
}
