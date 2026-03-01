import type { VenueWithScore } from '../types/venue';
import { formatDisplayTime } from './time';

export function buildShareUrl(venueId: string, hour: number): string {
  const url = new URL(window.location.href);
  url.search = `?v=${encodeURIComponent(venueId)}&h=${hour}`;
  return url.toString();
}

export function buildShareText(venue: VenueWithScore, hour: number, sunUntil: number | null): string {
  const isShaded = venue.geo?.shaded ?? venue.score < 40;
  const status = isShaded ? 'in the shade' : 'in direct sun';
  const until = sunUntil !== null && !isShaded ? ` until ${formatDisplayTime(sunUntil)}` : '';
  const url = buildShareUrl(venue.id, hour);
  return `☀️ ${venue.name} is ${status}${until} — check it on Daylight Maxxing: ${url}`;
}

export async function shareVenue(
  venue: VenueWithScore,
  hour: number,
  sunUntil: number | null
): Promise<'native' | 'clipboard'> {
  const url = buildShareUrl(venue.id, hour);
  const text = buildShareText(venue, hour, sunUntil);

  if (navigator.share) {
    await navigator.share({ title: 'Daylight Maxxing', text, url });
    return 'native';
  }

  await navigator.clipboard.writeText(url);
  return 'clipboard';
}
