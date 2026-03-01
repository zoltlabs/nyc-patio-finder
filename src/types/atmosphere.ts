export interface AtmosphereState {
  preset: string;
  stars: number;
  gh: number;
  fog: string;
  highFog: string;
  space: string;
  horizon: number;
  ambC: string;
  ambI: number;
  dirC: string;
  dirI: number;
  sunI: number;
  name: string;
  nameC: string;
}

export type ShadowStatusState = 'active' | 'computing' | 'unavailable';

export interface ShadowStatus {
  state: ShadowStatusState;
  label: string;
}

export interface LoadingState {
  visible: boolean;
  tokenRequired: boolean;
}

export interface OSMStatus {
  label: string;
  tone: 'loading' | 'success' | 'warning';
}
