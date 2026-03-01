export interface CityConfig {
  slug: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  bbox: string;
  zoom: number;
  bearing: number;
  pitch: number;
}

export const CITIES: Record<string, CityConfig> = {
  nyc: {
    slug: 'nyc',
    name: 'New York City',
    shortName: 'NYC',
    lat: 40.7484,
    lng: -73.9857,
    bbox: '40.65,-74.02,40.80,-73.90',
    zoom: 13.6,
    bearing: -12,
    pitch: 58,
  },
  sf: {
    slug: 'sf',
    name: 'San Francisco',
    shortName: 'SF',
    lat: 37.7749,
    lng: -122.4194,
    bbox: '37.70,-122.52,37.82,-122.35',
    zoom: 13.2,
    bearing: 0,
    pitch: 58,
  },
  chicago: {
    slug: 'chicago',
    name: 'Chicago',
    shortName: 'CHI',
    lat: 41.8781,
    lng: -87.6298,
    bbox: '41.83,-87.70,41.93,-87.58',
    zoom: 13,
    bearing: 0,
    pitch: 58,
  },
  boston: {
    slug: 'boston',
    name: 'Boston',
    shortName: 'BOS',
    lat: 42.3601,
    lng: -71.0589,
    bbox: '42.33,-71.12,42.39,-71.01',
    zoom: 13.5,
    bearing: 0,
    pitch: 58,
  },
  austin: {
    slug: 'austin',
    name: 'Austin',
    shortName: 'ATX',
    lat: 30.2672,
    lng: -97.7431,
    bbox: '30.23,-97.78,30.30,-97.70',
    zoom: 13.5,
    bearing: 0,
    pitch: 58,
  },
};

export const DEFAULT_CITY = 'nyc';

export function getCityBySlug(slug: string): CityConfig {
  return CITIES[slug] ?? CITIES[DEFAULT_CITY]!;
}
