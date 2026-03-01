import type { Map } from 'mapbox-gl';
import SunCalc from 'suncalc';
import type { AtmosphereState } from '../types/atmosphere';
import type { SunDirection, SunVisualState } from '../types/map';
import { dateAt } from './time';
import { lerp, lerpHex } from './colors';

export const NYC = { lat: 40.7484, lng: -73.9857 };

export function sunPos(hour: number) {
  return SunCalc.getPosition(dateAt(hour), NYC.lat, NYC.lng);
}

export function mapboxSunDir(hour: number): SunDirection {
  const position = sunPos(hour);
  const altDeg = position.altitude * (180 / Math.PI);
  const polarDeg = Math.max(0, Math.min(90, 90 - altDeg));
  let azDeg = ((position.azimuth + Math.PI) * (180 / Math.PI)) % 360;
  if (azDeg < 0) azDeg += 360;
  return { dir: [azDeg, polarDeg], altDeg, azDeg };
}

export function atmosphere(hour: number): AtmosphereState {
  if (hour < 6.4 || hour >= 22) {
    return {
      preset: 'night',
      stars: 0.92,
      gh: 0,
      fog: '#07081e',
      highFog: '#0e1030',
      space: '#010106',
      horizon: 0.32,
      ambC: '#223366',
      ambI: 0.04,
      dirC: '#001133',
      dirI: 0,
      sunI: 0,
      name: '🌙 Night',
      nameC: '#5577cc',
    };
  }
  if (hour < 8) {
    const t = (hour - 6.4) / 1.6;
    return {
      preset: 'dawn',
      stars: Math.max(0, 0.6 - t * 0.6),
      gh: t * 0.1,
      fog: lerpHex('#ee6644', '#ffccaa', t),
      highFog: lerpHex('#cc4488', '#ff9944', t),
      space: '#01091a',
      horizon: 0.18,
      ambC: lerpHex('#ff7744', '#ffddaa', t),
      ambI: lerp(0.08, 0.28, t),
      dirC: lerpHex('#ff6633', '#fff4e0', t),
      dirI: lerp(0.1, 0.6, t),
      sunI: lerp(3, 16, t),
      name: '🌅 Sunrise',
      nameC: '#ff8844',
    };
  }
  if (hour < 10) {
    const t = (hour - 8) / 2;
    return {
      preset: 'day',
      stars: 0,
      gh: 0,
      fog: lerpHex('#c8e4ff', '#eef8ff', t),
      highFog: lerpHex('#88ccee', '#55aadd', t),
      space: '#01091a',
      horizon: 0.07,
      ambC: '#d4edff',
      ambI: lerp(0.32, 0.42, t),
      dirC: '#fff9e8',
      dirI: lerp(0.62, 0.78, t),
      sunI: lerp(16, 20, t),
      name: '🌤 Morning',
      nameC: '#88ccee',
    };
  }
  if (hour < 16) {
    const peak = Math.sin(((hour - 10) / 6) * Math.PI);
    return {
      preset: 'day',
      stars: 0,
      gh: 0,
      fog: '#eef4ff',
      highFog: '#88b4e8',
      space: '#01091a',
      horizon: 0.05,
      ambC: '#e4f2ff',
      ambI: lerp(0.42, 0.65, peak),
      dirC: '#fffeee',
      dirI: lerp(0.78, 0.95, peak),
      sunI: lerp(20, 26, peak),
      name: '☀️ Bright Midday',
      nameC: '#fffde0',
    };
  }
  if (hour < 17.5) {
    const t = (hour - 16) / 1.5;
    return {
      preset: 'day',
      stars: 0,
      gh: t * 0.15,
      fog: lerpHex('#eef4ff', '#ffd8aa', t),
      highFog: lerpHex('#88b4e8', '#ff9933', t),
      space: '#01091a',
      horizon: 0.09,
      ambC: lerpHex('#e4f2ff', '#ffeedd', t),
      ambI: lerp(0.62, 0.44, t),
      dirC: lerpHex('#fffeee', '#ffcc55', t),
      dirI: lerp(0.95, 0.78, t),
      sunI: lerp(26, 20, t),
      name: '🌤 Late Afternoon',
      nameC: '#ffcc88',
    };
  }
  if (hour < 19.8) {
    const t = (hour - 17.5) / 2.3;
    return {
      preset: 'dusk',
      stars: t > 0.55 ? (t - 0.55) * 0.45 : 0,
      gh: lerp(0.55, 0.08, t),
      fog: lerpHex('#ffcc88', '#882244', t),
      highFog: lerpHex('#ff8833', '#551133', t),
      space: lerpHex('#01091a', '#010810', t),
      horizon: lerp(0.12, 0.26, t),
      ambC: lerpHex('#ffeecc', '#774466', t),
      ambI: Math.max(0.04, lerp(0.44, 0.06, t)),
      dirC: lerpHex('#ffcc55', '#ff5522', t),
      dirI: Math.max(0, lerp(0.78, 0, t)),
      sunI: Math.max(0, lerp(20, 0, t)),
      name: t < 0.6 ? '🌇 Golden Hour ✨' : '🌆 Sunset',
      nameC: t < 0.6 ? '#ffcc44' : '#ff6633',
    };
  }
  if (hour < 21.5) {
    const t = (hour - 19.8) / 1.7;
    return {
      preset: 'night',
      stars: lerp(0.28, 0.8, t),
      gh: 0,
      fog: lerpHex('#441133', '#0d0820', t),
      highFog: lerpHex('#220d33', '#09051e', t),
      space: lerpHex('#05050f', '#010106', t),
      horizon: lerp(0.26, 0.32, t),
      ambC: lerpHex('#441166', '#223355', t),
      ambI: Math.max(0.03, lerp(0.09, 0.03, t)),
      dirC: '#111122',
      dirI: 0,
      sunI: 0,
      name: '🌇 Twilight',
      nameC: '#885599',
    };
  }
  return {
    preset: 'night',
    stars: 0.92,
    gh: 0,
    fog: '#07081e',
    highFog: '#0e1030',
    space: '#010106',
    horizon: 0.32,
    ambC: '#223366',
    ambI: 0.04,
    dirC: '#001133',
    dirI: 0,
    sunI: 0,
    name: '🌃 Night',
    nameC: '#5577cc',
  };
}

function sunPalette(altitude: number) {
  if (altitude <= 6) {
    return {
      atmo: 'rgba(200,60,10,0.10)',
      corona: 'rgba(255,90,20,0.55)',
      ray: 'rgba(255,100,30,0.42)',
      disc1: '#ffbb88',
      disc2: '#ff6622',
      flare: 'rgba(255,100,40,0.55)',
    };
  }
  if (altitude <= 18) {
    return {
      atmo: 'rgba(255,140,30,0.09)',
      corona: 'rgba(255,180,60,0.52)',
      ray: 'rgba(255,190,60,0.40)',
      disc1: '#ffeebb',
      disc2: '#ffaa22',
      flare: 'rgba(255,190,70,0.50)',
    };
  }
  if (altitude <= 40) {
    return {
      atmo: 'rgba(255,210,80,0.07)',
      corona: 'rgba(255,228,120,0.46)',
      ray: 'rgba(255,225,100,0.36)',
      disc1: '#ffffe0',
      disc2: '#ffee88',
      flare: 'rgba(255,235,130,0.42)',
    };
  }
  return {
    atmo: 'rgba(240,248,255,0.06)',
    corona: 'rgba(255,255,235,0.40)',
    ray: 'rgba(255,255,210,0.30)',
    disc1: '#ffffff',
    disc2: '#fffff5',
    flare: 'rgba(255,255,230,0.36)',
  };
}

function getSunScreenPos(map: Map, hour: number) {
  const sun = mapboxSunDir(hour);
  const center = map.getCenter();
  const azRad = sun.azDeg * Math.PI / 180;
  const distance = 60000;
  const dLat = (distance * Math.cos(azRad)) / 111320;
  const dLng = (distance * Math.sin(azRad)) / (111320 * Math.cos(center.lat * Math.PI / 180));
  const horizonPoint = map.project([center.lng + dLng, center.lat + dLat]);
  const skyHeight = Math.max(horizonPoint.y, 60);
  const y = horizonPoint.y - (Math.max(0, sun.altDeg) / 90) * skyHeight * 1.18;
  return { x: horizonPoint.x, y: Math.max(8, y), alt: sun.altDeg };
}

export function buildSunVisualState(map: Map, hour: number): SunVisualState {
  const sun = mapboxSunDir(hour);
  const pos = getSunScreenPos(map, hour);
  const opacity = sun.altDeg >= 4 ? 1 : Math.max(0, (sun.altDeg + 5) / 9);
  const scaleFactor = Math.max(0.65, 2 - sun.altDeg / 28);
  const discSize = Math.round(46 * scaleFactor);
  const raysSize = Math.round(94 * scaleFactor);
  const coronaSize = Math.round(125 * scaleFactor);
  const atmoSize = Math.round(360 * scaleFactor);
  const flareWidth = Math.round(Math.max(60, 280 * Math.max(0, 1 - sun.altDeg / 60)));
  const blur = Math.max(6, Math.round(coronaSize / 11));
  const palette = sunPalette(sun.altDeg);

  return {
    opacity,
    left: pos.x,
    top: pos.y,
    atmoStyle: {
      width: atmoSize,
      height: atmoSize,
      background: `radial-gradient(circle,${palette.atmo} 0%,transparent 65%)`,
      filter: 'blur(22px)',
    },
    coronaStyle: {
      width: coronaSize,
      height: coronaSize,
      background: `radial-gradient(circle,${palette.corona} 0%,transparent 70%)`,
      filter: `blur(${blur}px)`,
    },
    raysStyle: {
      width: raysSize,
      height: raysSize,
      background: `repeating-conic-gradient(${palette.ray} 0deg 3.5deg,transparent 3.5deg 45deg)`,
    },
    discStyle: {
      width: discSize,
      height: discSize,
      background: `radial-gradient(circle,#fff 0%,${palette.disc1} 32%,${palette.disc2} 68%,transparent 100%)`,
      boxShadow: `0 0 ${Math.round(discSize * 0.55)}px ${Math.round(discSize * 0.28)}px ${palette.corona}, 0 0 ${Math.round(discSize * 1.6)}px ${Math.round(discSize * 0.65)}px ${palette.atmo}`,
    },
    flareStyle: {
      width: flareWidth,
      background: `linear-gradient(to right,transparent,${palette.flare} 30%,rgba(255,255,255,0.75) 50%,${palette.flare} 70%,transparent)`,
      opacity: Math.max(0, 0.75 - sun.altDeg / 40),
    },
  };
}
