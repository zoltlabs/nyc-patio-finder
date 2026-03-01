import type { CSSProperties } from 'react';
import type { GeoJSONFeature } from 'mapbox-gl';

export interface SunDirection {
  dir: [number, number];
  altDeg: number;
  azDeg: number;
}

export interface VenueFeatureProperties {
  id: string;
  name: string;
  type: string;
  hood: string;
  score: number;
  color: string;
  geoVerified: boolean;
  shaded: boolean | null;
  reason: string;
}

export interface VenueFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: VenueFeatureProperties;
}

export interface VenueFeatureCollection {
  type: 'FeatureCollection';
  features: VenueFeature[];
}

export interface MapViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SunVisualState {
  opacity: number;
  left: number;
  top: number;
  atmoStyle: CSSProperties;
  coronaStyle: CSSProperties;
  raysStyle: CSSProperties;
  discStyle: CSSProperties;
  flareStyle: CSSProperties;
}

export interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

export type BuildingFeature = GeoJSONFeature;
