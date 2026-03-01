import { describe, expect, it } from 'vitest';
import { applyVenueFilters, buildGeoJSON, scoreVenues } from './scoring';
import type { ShadowScore, Venue } from '../types/venue';

const VENUES: Venue[] = [
  {
    id: 'v1',
    name: 'Skyline Bar',
    category: 'bar',
    outdoorSetting: 'rooftop',
    lat: 40.75,
    lng: -73.99,
    hood: 'Midtown',
    facing: 'all',
  },
  {
    id: 'v2',
    name: 'Garden Cafe',
    category: 'cafe',
    outdoorSetting: 'garden',
    lat: 40.72,
    lng: -73.95,
    hood: 'Williamsburg',
    facing: 'south',
  },
  {
    id: 'v3',
    name: 'Patio Grill',
    category: 'restaurant',
    outdoorSetting: 'patio',
    lat: 40.71,
    lng: -74,
    hood: 'Midtown',
    facing: 'west',
  },
];

describe('applyVenueFilters', () => {
  it('applies neighborhood, category, and outdoor setting filters together', () => {
    const filtered = applyVenueFilters(VENUES, {
      neighborhood: 'Midtown',
      category: 'bar',
      outdoorSetting: 'rooftop',
    });

    expect(filtered.map((venue) => venue.id)).toEqual(['v1']);
  });

  it('returns all venues when every filter is set to all', () => {
    const filtered = applyVenueFilters(VENUES, {
      neighborhood: 'all',
      category: 'all',
      outdoorSetting: 'all',
    });

    expect(filtered.map((venue) => venue.id)).toEqual(['v1', 'v2', 'v3']);
  });
});

describe('scoreVenues', () => {
  it('uses geometric shadow overrides and sorts by descending score', () => {
    const shadowScores: Record<string, ShadowScore> = {
      v1: { score: 15, shaded: true, reason: 'Blocked', geo: true },
      v3: { score: 88, shaded: false, reason: 'Clear', geo: true },
    };

    const scored = scoreVenues(VENUES, 16, shadowScores);

    expect(scored[0]?.id).toBe('v3');
    expect(scored.find((venue) => venue.id === 'v1')?.score).toBe(15);
    expect(scored.find((venue) => venue.id === 'v1')?.geo?.reason).toBe('Blocked');
  });
});

describe('buildGeoJSON', () => {
  it('includes category and outdoor setting in feature properties', () => {
    const geojson = buildGeoJSON([VENUES[0]], 15, {});
    const feature = geojson.features[0];

    expect(feature?.properties.category).toBe('bar');
    expect(feature?.properties.outdoorSetting).toBe('rooftop');
  });
});
