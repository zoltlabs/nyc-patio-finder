import type { CityConfig } from '../data/cities';
import type { AddressResult } from '../types/location';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapboxFeature {
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
  properties?: {
    full_address?: string;
    name?: string;
    place_formatted?: string;
  };
}

interface MapboxGeocodingResponse {
  features?: MapboxFeature[];
}

function cityBboxToMapboxBbox(bbox: string): string {
  const [south, west, north, east] = bbox.split(',').map(Number);
  return `${west},${south},${east},${north}`;
}

function mapFeatureToAddressResult(feature: MapboxFeature): AddressResult | null {
  const coordinates = feature.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;

  const [lng, lat] = coordinates;
  const label =
    feature.properties?.full_address ??
    [feature.properties?.name, feature.properties?.place_formatted].filter(Boolean).join(', ');

  if (!label) return null;

  return { label, lat, lng };
}

async function fetchMapboxAddresses(
  query: string,
  city: CityConfig,
  options: { autocomplete: boolean; limit: number }
): Promise<AddressResult[]> {
  if (!MAPBOX_TOKEN) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('autocomplete', String(options.autocomplete));
  url.searchParams.set('country', 'US');
  url.searchParams.set('types', 'address,street');
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(options.limit));
  url.searchParams.set('proximity', `${city.lng},${city.lat}`);
  url.searchParams.set('bbox', cityBboxToMapboxBbox(city.bbox));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed with status ${response.status}`);
  }

  const data = (await response.json()) as MapboxGeocodingResponse;
  return (data.features ?? []).map(mapFeatureToAddressResult).filter((result): result is AddressResult => Boolean(result));
}

export async function fetchAddressSuggestions(query: string, city: CityConfig): Promise<AddressResult[]> {
  return fetchMapboxAddresses(query, city, { autocomplete: true, limit: 5 });
}

export async function geocodeAddress(query: string, city: CityConfig): Promise<AddressResult | null> {
  const [result] = await fetchMapboxAddresses(query, city, { autocomplete: false, limit: 1 });
  return result ?? null;
}
