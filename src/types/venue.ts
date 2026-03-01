export type VenueType = 'rooftop' | 'garden' | 'patio';

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
  type: VenueType;
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
