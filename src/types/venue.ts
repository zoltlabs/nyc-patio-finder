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

export interface VenueWithScore extends Venue {
  score: number;
  geo?: ShadowScore;
}
