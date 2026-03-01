import { CURATED_VENUES } from '../data/curatedVenues';
import type { CityConfig } from '../data/cities';
import type { AddressResult } from '../types/location';
import type { Facing, Venue, VenueCategory } from '../types/venue';
import type { OverpassResponse } from '../types/map';

interface NominatimSearchResult {
  display_name?: string;
  lat: string;
  lon: string;
}

export function guessFacing(lat: number, lng: number): Facing {
  const options: Facing[] = ['south', 'south', 'west', 'west', 'east', 'south', 'west', 'all'];
  return options[Math.abs(Math.round(lat * 1337 + lng * 997)) % options.length] ?? 'all';
}

export function normalizeOSMCategory(tags: Record<string, string>): VenueCategory {
  switch (tags.amenity) {
    case 'bar':
    case 'pub':
      return 'bar';
    case 'restaurant':
      return 'restaurant';
    case 'cafe':
      return 'cafe';
    default:
      return 'restaurant';
  }
}

function bboxToViewbox(bbox: string): string {
  const [south, west, north, east] = bbox.split(',').map(Number);
  return `${west},${north},${east},${south}`;
}

export async function geocodeAddress(query: string, city: CityConfig): Promise<AddressResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('bounded', '1');
  url.searchParams.set('viewbox', bboxToViewbox(city.bbox));
  url.searchParams.set('q', trimmed);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const results = (await response.json()) as NominatimSearchResult[];
  const match = results[0];
  if (!match) return null;

  return {
    label: match.display_name ?? trimmed,
    lat: Number(match.lat),
    lng: Number(match.lon),
  };
}

export async function fetchOSMVenues(city: CityConfig): Promise<Venue[]> {
  const query = `[out:json][timeout:30];
(
  node["amenity"="bar"]["outdoor_seating"="yes"](${city.bbox});
  node["amenity"="pub"]["outdoor_seating"="yes"](${city.bbox});
  node["amenity"="restaurant"]["outdoor_seating"="yes"](${city.bbox});
  node["amenity"="cafe"]["outdoor_seating"="yes"](${city.bbox});
);
out;`;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`OSM request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OverpassResponse;
  const osmVenues: Venue[] = data.elements
    .filter((element) => element.tags?.name && element.lat != null && element.lon != null)
    .map((element) => ({
      id: `osm_${element.id}`,
      name: element.tags?.name ?? 'Unknown venue',
      outdoorSetting: 'patio',
      category: normalizeOSMCategory(element.tags ?? {}),
      lat: element.lat as number,
      lng: element.lon as number,
      hood: element.tags?.['addr:suburb'] || element.tags?.['addr:neighbourhood'] || city.shortName,
      facing: guessFacing(element.lat as number, element.lon as number),
    }));

  // Only merge with curated venues for NYC
  if (city.slug === 'nyc') {
    const merged = [...CURATED_VENUES];
    for (const venue of osmVenues) {
      const duplicate = merged.some(
        (curated) => Math.abs(curated.lat - venue.lat) < 0.0005 && Math.abs(curated.lng - venue.lng) < 0.0005
      );
      if (!duplicate) merged.push(venue);
    }
    return merged;
  }

  return osmVenues;
}
