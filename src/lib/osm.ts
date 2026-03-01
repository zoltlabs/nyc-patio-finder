import { CURATED_VENUES } from '../data/curatedVenues';
import type { Facing, Venue } from '../types/venue';
import type { OverpassResponse } from '../types/map';

export function guessFacing(lat: number, lng: number): Facing {
  const options: Facing[] = ['south', 'south', 'west', 'west', 'east', 'south', 'west', 'all'];
  return options[Math.abs(Math.round(lat * 1337 + lng * 997)) % options.length] ?? 'all';
}

export async function fetchOSMVenues(): Promise<Venue[]> {
  const bbox = '40.65,-74.02,40.80,-73.90';
  const query = `[out:json][timeout:30];
(
  node["amenity"="bar"]["outdoor_seating"="yes"](${bbox});
  node["amenity"="pub"]["outdoor_seating"="yes"](${bbox});
  node["amenity"="restaurant"]["outdoor_seating"="yes"](${bbox});
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
      type: 'patio',
      lat: element.lat as number,
      lng: element.lon as number,
      hood: element.tags?.['addr:suburb'] || element.tags?.['addr:neighbourhood'] || 'NYC',
      facing: guessFacing(element.lat as number, element.lon as number),
    }));

  const merged = [...CURATED_VENUES];
  for (const venue of osmVenues) {
    const duplicate = merged.some(
      (curated) => Math.abs(curated.lat - venue.lat) < 0.0005 && Math.abs(curated.lng - venue.lng) < 0.0005
    );
    if (!duplicate) merged.push(venue);
  }

  return merged;
}
