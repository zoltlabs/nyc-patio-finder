export type OutdoorSetting = 'rooftop' | 'garden' | 'patio';
export type VenueCategory = 'bar' | 'restaurant' | 'cafe' | 'brewery';

export type Facing =
  | 'all'
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest';

export interface Venue {
  id: string;
  name: string;
  outdoorSetting: OutdoorSetting;
  category: VenueCategory;
  lat: number;
  lng: number;
  hood: string;
  facing: Facing;
}

export interface ShadowScore {
  score: number;
  shaded: boolean;
  reason: string;
  geo: boolean;
}

export type SunSearchWindowPreset = 'now' | '1h' | '2h' | '4h' | '6h' | 'until-sunset' | 'custom';
export type SunSearchMode = 'total-sun' | 'continuous-sun' | 'sunny-right-away';

export interface SunSearchCustomRange {
  startHour: number;
  endHour: number;
}

export interface VenueTimelineSample {
  hour: number;
  score: number;
  sunny: boolean;
}

export interface VenueWindowMetrics {
  totalSunnyMinutes: number;
  longestSunnyMinutes: number;
  nextShadeHour: number | null;
  firstSunnyHour: number | null;
  averageScore: number;
  sunnyNow: boolean;
  currentScore: number;
  rankingValue: number;
  explanation: string;
  timeline: VenueTimelineSample[];
}

export interface VenueWithScore extends Venue {
  score: number;
  geo?: ShadowScore;
  windowMetrics?: VenueWindowMetrics;
}
