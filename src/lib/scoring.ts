import SunCalc from 'suncalc';
import type {
  OutdoorSetting,
  ShadowScore,
  SunSearchCustomRange,
  SunSearchMode,
  SunSearchWindowPreset,
  Venue,
  VenueCategory,
  VenueWithScore,
  VenueWindowMetrics,
} from '../types/venue';
import type { VenueFeatureCollection } from '../types/map';
import { scoreColor } from './colors';
import { sunPos, type Coords } from './sun';
import { formatDisplayTime, roundToQuarter } from './time';

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

const SUNNY_THRESHOLD = 40;
const SAMPLE_STEP_HOURS = 0.25;
const MINUTES_PER_SAMPLE = 15;

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) return `${hours}h ${remainingMinutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainingMinutes}m`;
}

function getSunsetHour(coords: Coords): number {
  const sunset = SunCalc.getTimes(new Date(), coords.lat, coords.lng).sunset;
  return roundToQuarter(sunset.getHours() + sunset.getMinutes() / 60);
}

function normalizeCustomRange(customRange: SunSearchCustomRange | undefined, fallbackStartHour: number): SunSearchCustomRange {
  if (!customRange) {
    return {
      startHour: fallbackStartHour,
      endHour: Math.min(23, roundToQuarter(fallbackStartHour + 2)),
    };
  }

  const startHour = roundToQuarter(Math.max(0, Math.min(23, customRange.startHour)));
  const endHour = roundToQuarter(Math.max(startHour, Math.min(23, customRange.endHour)));
  return { startHour, endHour };
}

function buildWindowMeta(
  preset: SunSearchWindowPreset,
  fallbackStartHour: number,
  coords: Coords,
  customRange?: SunSearchCustomRange
) {
  const sunsetHour = getSunsetHour(coords);
  const normalizedCustomRange = normalizeCustomRange(customRange, fallbackStartHour);

  switch (preset) {
    case '1h':
      return {
        startHour: fallbackStartHour,
        endHour: Math.min(23, roundToQuarter(fallbackStartHour + 1)),
        label: 'Next 1 Hour',
        summaryLabel: 'the next hour',
        sunsetHour,
      };
    case '2h':
      return {
        startHour: fallbackStartHour,
        endHour: Math.min(23, roundToQuarter(fallbackStartHour + 2)),
        label: 'Next 2 Hours',
        summaryLabel: 'the next 2h',
        sunsetHour,
      };
    case '4h':
      return {
        startHour: fallbackStartHour,
        endHour: Math.min(23, roundToQuarter(fallbackStartHour + 4)),
        label: 'Next 4 Hours',
        summaryLabel: 'the next 4h',
        sunsetHour,
      };
    case '6h':
      return {
        startHour: fallbackStartHour,
        endHour: Math.min(23, roundToQuarter(fallbackStartHour + 6)),
        label: 'Next 6 Hours',
        summaryLabel: 'the next 6h',
        sunsetHour,
      };
    case 'until-sunset':
      return {
        startHour: fallbackStartHour,
        endHour: Math.max(fallbackStartHour, sunsetHour),
        label: 'Until Sunset',
        summaryLabel: 'until sunset',
        sunsetHour,
      };
    case 'custom':
      return {
        startHour: normalizedCustomRange.startHour,
        endHour: normalizedCustomRange.endHour,
        label: `${formatDisplayTime(normalizedCustomRange.startHour)} to ${formatDisplayTime(normalizedCustomRange.endHour)}`,
        summaryLabel: `from ${formatDisplayTime(normalizedCustomRange.startHour)} to ${formatDisplayTime(normalizedCustomRange.endHour)}`,
        sunsetHour,
      };
    case 'now':
    default:
      return {
        startHour: fallbackStartHour,
        endHour: fallbackStartHour,
        label: 'Right Now',
        summaryLabel: 'right now',
        sunsetHour,
      };
  }
}

function buildTimelineSamples(venue: Venue, startHour: number, endHour: number, coords: Coords) {
  const samples: VenueWindowMetrics['timeline'] = [];

  for (let hour = startHour; hour <= endHour + 0.001; hour = roundToQuarter(hour + SAMPLE_STEP_HOURS)) {
    const score = calcScore(venue, hour, coords);
    samples.push({
      hour,
      score,
      sunny: score >= SUNNY_THRESHOLD,
    });
  }

  return samples;
}

function getLongestSunnyMinutes(samples: VenueWindowMetrics['timeline']): number {
  let longestRun = 0;
  let currentRun = 0;

  for (const sample of samples) {
    if (sample.sunny) {
      currentRun += MINUTES_PER_SAMPLE;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return longestRun;
}

function buildWindowExplanation(
  metrics: Omit<VenueWindowMetrics, 'rankingValue' | 'explanation'>,
  mode: SunSearchMode,
  summaryLabel: string,
  startsInFuture: boolean
): string {
  const startLabel = startsInFuture ? 'at the start of the window' : 'right away';
  const shadedLabel = startsInFuture ? 'Shaded at the start, then sun from' : 'Shaded now, then sun from';

  if (metrics.totalSunnyMinutes === 0) {
    if (metrics.firstSunnyHour !== null) return `${shadedLabel} ${formatDisplayTime(metrics.firstSunnyHour)}`;
    return `Little direct sun ${summaryLabel}`;
  }

  if (mode === 'continuous-sun') {
    if (metrics.longestSunnyMinutes > 0) return `${formatMinutes(metrics.longestSunnyMinutes)} of uninterrupted sun ${summaryLabel}`;
  }

  if (mode === 'sunny-right-away') {
    if (metrics.sunnyNow && metrics.nextShadeHour !== null) {
      return `Sunny ${startLabel}, shaded after ${formatDisplayTime(metrics.nextShadeHour)}`;
    }
    if (metrics.sunnyNow) return `Sunny ${startLabel} with strong near-term sun`;
    if (metrics.firstSunnyHour !== null) return `Sun starts at ${formatDisplayTime(metrics.firstSunnyHour)}`;
  }

  if (metrics.sunnyNow && metrics.nextShadeHour !== null) {
    return `${formatMinutes(metrics.totalSunnyMinutes)} of direct sun ${summaryLabel} · sunny until ${formatDisplayTime(metrics.nextShadeHour)}`;
  }

  return `${formatMinutes(metrics.totalSunnyMinutes)} of direct sun ${summaryLabel}`;
}

function computeWindowMetrics(
  venue: Venue,
  fallbackStartHour: number,
  preset: SunSearchWindowPreset,
  mode: SunSearchMode,
  coords: Coords,
  customRange?: SunSearchCustomRange
): VenueWindowMetrics | undefined {
  if (preset === 'now') return undefined;

  const { startHour, endHour, summaryLabel } = buildWindowMeta(preset, fallbackStartHour, coords, customRange);
  const timeline = buildTimelineSamples(venue, startHour, endHour, coords);
  const currentScore = timeline[0]?.score ?? 0;
  const sunnyNow = (timeline[0]?.sunny ?? false) || false;
  const totalSunnyMinutes = timeline.filter((sample) => sample.sunny).length * MINUTES_PER_SAMPLE;
  const longestSunnyMinutes = getLongestSunnyMinutes(timeline);
  const nextShadeHour =
    sunnyNow ? timeline.slice(1).find((sample) => !sample.sunny)?.hour ?? null : null;
  const firstSunnyHour =
    !sunnyNow ? timeline.find((sample) => sample.sunny)?.hour ?? null : startHour;
  const averageScore =
    timeline.length > 0 ? timeline.reduce((sum, sample) => sum + sample.score, 0) / timeline.length : 0;

  let rankingValue = timeline.reduce((sum, sample) => sum + sample.score, 0);
  if (mode === 'continuous-sun') {
    rankingValue = longestSunnyMinutes * 100 + totalSunnyMinutes + averageScore;
  } else if (mode === 'sunny-right-away') {
    rankingValue = timeline.reduce((sum, sample, index) => sum + sample.score / (index + 1), 0);
  }

  const metricsBase = {
    totalSunnyMinutes,
    longestSunnyMinutes,
    nextShadeHour,
    firstSunnyHour,
    averageScore,
    sunnyNow,
    currentScore,
    timeline,
  };

  return {
    ...metricsBase,
    rankingValue,
    explanation: buildWindowExplanation(metricsBase, mode, summaryLabel, startHour > fallbackStartHour),
  };
}

export interface ScoreVenuesOptions {
  currentHour: number;
  shadowScores: Record<string, ShadowScore>;
  coords: Coords;
  windowPreset?: SunSearchWindowPreset;
  rankingMode?: SunSearchMode;
  customRange?: SunSearchCustomRange;
}

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

export function calcOpenSkyScore(hour: number, coords: Coords): number {
  const position = sunPos(hour, coords);
  if (position.altitude <= 0) return 0;

  const altDeg = position.altitude * (180 / Math.PI);
  return Math.min(100, Math.round(altDeg <= 50 ? (altDeg / 50) * 100 : 100 - ((altDeg - 50) / 40) * 12));
}

export function calcScore(venue: Venue, hour: number, coords: Coords): number {
  const position = sunPos(hour, coords);
  if (position.altitude <= 0) return 0;
  const altDeg = position.altitude * (180 / Math.PI);

  if (venue.outdoorSetting === 'rooftop' || venue.facing === 'all') {
    return calcOpenSkyScore(hour, coords);
  }

  const sunAz = ((position.azimuth + Math.PI) * (180 / Math.PI) + 360) % 360;
  const patioAz = FACE_DEG[venue.facing] ?? 180;
  let diff = Math.abs(sunAz - patioAz);
  if (diff > 180) diff = 360 - diff;
  return Math.round((Math.max(0, 1 - diff / 90) * 0.75 + Math.min(1, altDeg / 50) * 0.25) * 100);
}

export function scoreOpenSkyLocation(hour: number, coords: Coords): ShadowScore {
  const position = sunPos(hour, coords);
  const altDeg = Math.round(position.altitude * (180 / Math.PI));

  if (position.altitude <= 0) {
    return { score: 0, shaded: true, reason: 'Sun below horizon', geo: false };
  }

  return {
    score: calcOpenSkyScore(hour, coords),
    shaded: false,
    reason: `Open sky · ${altDeg}° sun`,
    geo: false,
  };
}

export function scoreVenues(
  venues: Venue[],
  options: ScoreVenuesOptions
): VenueWithScore[] {
  const {
    currentHour,
    shadowScores,
    coords,
    windowPreset = 'now',
    rankingMode = 'total-sun',
    customRange,
  } = options;

  return venues
    .map((venue) => {
      const geo = shadowScores[venue.id];
      const currentScore = geo?.score ?? calcScore(venue, currentHour, coords);
      const windowMetrics = computeWindowMetrics(venue, currentHour, windowPreset, rankingMode, coords, customRange);
      const score = Math.round(windowMetrics?.averageScore ?? currentScore);
      return { ...venue, score, geo, windowMetrics };
    })
    .sort((a, b) => {
      const primary = (b.windowMetrics?.rankingValue ?? b.score) - (a.windowMetrics?.rankingValue ?? a.score);
      if (primary !== 0) return primary;
      return (b.windowMetrics?.currentScore ?? b.score) - (a.windowMetrics?.currentScore ?? a.score);
    });
}

export function computeSunUntil(
  venue: Venue,
  fromHour: number,
  shadowScores: Record<string, ShadowScore>,
  coords: Coords
): number | null {
  const geo = shadowScores[venue.id];
  const currentScore = geo?.score ?? calcScore(venue, fromHour, coords);
  if (currentScore < SUNNY_THRESHOLD) return null;

  for (let h = fromHour + 0.25; h <= 23; h = Math.round((h + 0.25) * 4) / 4) {
    if (calcScore(venue, h, coords) < SUNNY_THRESHOLD) return h;
  }
  return null;
}

export function describeTimeWindow(
  preset: SunSearchWindowPreset,
  startHour: number,
  coords: Coords,
  customRange?: SunSearchCustomRange
) {
  return buildWindowMeta(preset, startHour, coords, customRange);
}

export function buildGeoJSON(
  venues: Venue[],
  hour: number,
  shadowScores: Record<string, ShadowScore>,
  coords: Coords,
  cityShortName: string
): VenueFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((venue) => {
      const geo = shadowScores[venue.id];
      const score = geo?.score ?? calcScore(venue, hour, coords);
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
          hood: venue.hood || cityShortName,
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
