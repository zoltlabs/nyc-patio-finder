import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import SunCalc from 'suncalc';

// ═══════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const NYC = { lat: 40.7484, lng: -73.9857 };

// ═══════════════════════════════════════════════════
//  CURATED VENUES
// ═══════════════════════════════════════════════════
const CURATED = [
  { id:'c01', name:'230 Fifth Rooftop',         type:'rooftop', lat:40.7431, lng:-73.9891, hood:'Flatiron',        facing:'all'   },
  { id:'c02', name:'Westlight (William Vale)',   type:'rooftop', lat:40.7205, lng:-73.9577, hood:'Williamsburg',   facing:'all'   },
  { id:'c03', name:'1 Hotel Brooklyn Bridge',   type:'rooftop', lat:40.6994, lng:-73.9960, hood:'DUMBO',          facing:'all'   },
  { id:'c04', name:'The Press Lounge',           type:'rooftop', lat:40.7602, lng:-74.0010, hood:"Hell's Kitchen", facing:'west'  },
  { id:'c05', name:'Gallow Green',               type:'garden',  lat:40.7474, lng:-74.0029, hood:'Chelsea',        facing:'all'   },
  { id:'c06', name:'The Ides at Wythe Hotel',    type:'rooftop', lat:40.7224, lng:-73.9590, hood:'Williamsburg',   facing:'west'  },
  { id:'c07', name:'Alma Restaurant',            type:'rooftop', lat:40.6762, lng:-74.0046, hood:'Red Hook',       facing:'east'  },
  { id:'c08', name:'Cantina Rooftop',            type:'rooftop', lat:40.7590, lng:-73.9901, hood:"Hell's Kitchen", facing:'all'   },
  { id:'c09', name:'Rooftop at Pier 17',         type:'rooftop', lat:40.7052, lng:-74.0021, hood:'Seaport',        facing:'all'   },
  { id:'c10', name:'The Skylark',                type:'rooftop', lat:40.7537, lng:-73.9950, hood:'Midtown West',   facing:'all'   },
  { id:'c11', name:'Employees Only',             type:'patio',   lat:40.7339, lng:-74.0052, hood:'West Village',   facing:'south' },
  { id:'c12', name:'Maison Premiere',            type:'garden',  lat:40.7139, lng:-73.9573, hood:'Williamsburg',   facing:'south' },
  { id:'c13', name:'Threes Brewing',             type:'garden',  lat:40.6648, lng:-73.9847, hood:'Gowanus',        facing:'south' },
  { id:'c14', name:'Berry Park',                 type:'rooftop', lat:40.7215, lng:-73.9560, hood:'Williamsburg',   facing:'south' },
  { id:'c15', name:'Greenwood Park',             type:'garden',  lat:40.6488, lng:-73.9832, hood:'Windsor Terrace',facing:'all'   },
  { id:'c16', name:'Fort Defiance',              type:'patio',   lat:40.6744, lng:-74.0167, hood:'Red Hook',       facing:'west'  },
  { id:'c17', name:'Transmitter Brewing',        type:'garden',  lat:40.7540, lng:-73.9412, hood:'LIC',            facing:'west'  },
  { id:'c18', name:'Casa Mezcal',                type:'patio',   lat:40.7200, lng:-73.9900, hood:'Lower East Side',facing:'south' },
  { id:'c19', name:"Sunny's Bar",                type:'patio',   lat:40.6760, lng:-74.0156, hood:'Red Hook',       facing:'south' },
  { id:'c20', name:'Radegast Hall',              type:'garden',  lat:40.7183, lng:-73.9550, hood:'Williamsburg',   facing:'south' },
  { id:'c21', name:'The Osprey',                 type:'patio',   lat:40.6988, lng:-73.9965, hood:'DUMBO',          facing:'west'  },
  { id:'c22', name:"Lula's Beer Garden",         type:'garden',  lat:40.6792, lng:-73.9800, hood:'Crown Heights',  facing:'all'   },
  { id:'c23', name:'LIC Bar',                    type:'patio',   lat:40.7459, lng:-73.9499, hood:'LIC',            facing:'south' },
  { id:'c24', name:'Hotel Delmano',              type:'patio',   lat:40.7196, lng:-73.9556, hood:'Williamsburg',   facing:'west'  },
  { id:'c25', name:'Bar Cima at Grayson Hotel',  type:'rooftop', lat:40.7532, lng:-73.9848, hood:'Midtown',        facing:'south' },
];

// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════
let allVenues   = [...CURATED];
let selectedNeighborhood = 'all';
const INITIAL_NOW = new Date();
let currentHour = roundToQuarter(INITIAL_NOW.getHours() + INITIAL_NOW.getMinutes() / 60);
let rafPending  = null;
let map, popup;

// Shadow analysis state
let buildingCache   = null;
let shadowScores    = {};
let shadowDebounce  = null;

// ═══════════════════════════════════════════════════
//  SUN MATH
// ═══════════════════════════════════════════════════
function roundToQuarter(h) { return Math.min(23, Math.max(0, Math.round(h * 4) / 4)); }
function dateAt(hour) {
  const d = new Date();
  d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return d;
}
function sunPos(hour) { return SunCalc.getPosition(dateAt(hour), NYC.lat, NYC.lng); }
function mapboxSunDir(hour) {
  const p = sunPos(hour);
  const altDeg   = p.altitude * (180 / Math.PI);
  const polarDeg = Math.max(0, Math.min(90, 90 - altDeg));
  let   azDeg    = ((p.azimuth + Math.PI) * (180 / Math.PI)) % 360;
  if (azDeg < 0) azDeg += 360;
  return { dir:[azDeg, polarDeg], altDeg, azDeg };
}

// ═══════════════════════════════════════════════════
//  VENUE HELPERS
// ═══════════════════════════════════════════════════
function filteredVenues() {
  return selectedNeighborhood === 'all' ? allVenues
    : allVenues.filter(v => v.hood === selectedNeighborhood);
}
function formatDateLabel() {
  const now = new Date();
  return `Today · ${now.toLocaleDateString(undefined,{weekday:'short'})}, ${now.toLocaleDateString(undefined,{month:'short'})} ${now.getDate()} · Real 3D NYC`;
}
function renderNeighborhoodOptions() {
  const sel = document.getElementById('hood-filter');
  const hoods = [...new Set(allVenues.map(v => v.hood).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  sel.innerHTML = ['<option value="all">All neighborhoods</option>',
    ...hoods.map(h=>`<option value="${h}">${h}</option>`)].join('');
  sel.value = hoods.includes(selectedNeighborhood) ? selectedNeighborhood : 'all';
  selectedNeighborhood = sel.value;
}
function refreshVenueSource() {
  try { map.getSource('venues')?.setData(buildGeoJSON(filteredVenues(), currentHour)); } catch(_){}
}
function currentTimeLabel() {
  const h=Math.floor(currentHour), m=Math.round((currentHour%1)*60);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
}

// ═══════════════════════════════════════════════════
//  DIRECTIONAL SCORE (fallback when geo not ready)
// ═══════════════════════════════════════════════════
const FACE_DEG = { all:null, north:0, northeast:45, east:90, southeast:135,
                   south:180, southwest:225, west:270, northwest:315 };

function calcScore(venue, hour) {
  const p = sunPos(hour);
  if (p.altitude <= 0) return 0;
  const altDeg = p.altitude * (180 / Math.PI);
  if (venue.type === 'rooftop' || venue.facing === 'all') {
    return Math.min(100, Math.round(altDeg <= 50 ? (altDeg/50)*100 : 100-((altDeg-50)/40)*12));
  }
  const sunAz   = ((p.azimuth + Math.PI) * (180 / Math.PI) + 360) % 360;
  const patioAz = FACE_DEG[venue.facing] ?? 180;
  let diff = Math.abs(sunAz - patioAz);
  if (diff > 180) diff = 360 - diff;
  return Math.round((Math.max(0,1-diff/90)*0.75 + Math.min(1,altDeg/50)*0.25) * 100);
}

// ═══════════════════════════════════════════════════
//  REAL SHADOW SCORING  (querySourceFeatures + ray cast)
// ═══════════════════════════════════════════════════

function getFeatureCenter(f) {
  const g = f.geometry;
  if (!g) return null;
  let ring;
  if      (g.type === 'Polygon')      ring = g.coordinates[0];
  else if (g.type === 'MultiPolygon') ring = g.coordinates[0][0];
  else if (g.type === 'Point')        return { lat: g.coordinates[1], lng: g.coordinates[0] };
  else return null;
  if (!ring?.length) return null;
  return { lat: ring.reduce((s,p)=>s+p[1],0)/ring.length,
           lng: ring.reduce((s,p)=>s+p[0],0)/ring.length };
}

function loadBuildingCache() {
  try {
    const raw = map.querySourceFeatures('composite', { sourceLayer: 'building' });
    const seen = new Set();
    buildingCache = raw.filter(f => {
      const h = +(f.properties?.height || f.properties?.render_height || 0);
      if (h < 3 || f.properties?.underground === 'true') return false;
      const key = f.id != null ? String(f.id) : null;
      if (key) { if (seen.has(key)) return false; seen.add(key); }
      return true;
    });
    return buildingCache.length > 0;
  } catch(e) {
    buildingCache = [];
    return false;
  }
}

function dirLabel(azDeg) {
  return ['N','NE','E','SE','S','SW','W','NW','N'][Math.round(azDeg/45)%8];
}

function computeGeometricShadow(venue, hour) {
  if (!buildingCache?.length) return null;
  const sun = mapboxSunDir(hour);
  if (sun.altDeg <= 0) return { score:0, shaded:true, reason:'Sun below horizon', geo:true };

  const maxDist = venue.type === 'rooftop' ? 120 : 550;
  const tol = venue.type === 'rooftop' ? 40 : 30;

  const latM = 111320;
  const lngM = 111320 * Math.cos(venue.lat * Math.PI / 180);

  let best = null;

  for (const b of buildingCache) {
    const bc = getFeatureCenter(b);
    if (!bc) continue;

    const dLatM = (bc.lat - venue.lat) * latM;
    const dLngM = (bc.lng - venue.lng) * lngM;
    const dist  = Math.sqrt(dLatM*dLatM + dLngM*dLngM);
    if (dist < 6 || dist > maxDist) continue;

    const bearDeg = (Math.atan2(dLngM, dLatM) * 180 / Math.PI + 360) % 360;
    let azDiff = Math.abs(bearDeg - sun.azDeg);
    if (azDiff > 180) azDiff = 360 - azDiff;
    if (azDiff > tol) continue;

    const h = +(b.properties.height || b.properties.render_height || 0);
    const rawBlock = Math.atan(h / dist) * 180 / Math.PI;
    const effBlock = rawBlock * Math.cos((azDiff / tol) * (Math.PI / 2));

    if (effBlock > sun.altDeg + 1.0) {
      if (!best || effBlock > best.effBlock) {
        best = { effBlock, dist, h };
      }
    }
  }

  if (best) {
    const depth = Math.min(1, (best.effBlock - sun.altDeg) / 22);
    const score = Math.max(3, Math.round((1 - depth * 0.93) * 38));
    return {
      score,
      shaded: true,
      reason: `${Math.round(best.h)}m bldg ~${Math.round(best.dist)}m ${dirLabel(sun.azDeg)}`,
      geo: true,
    };
  }

  return { score: calcScore(venue, hour), shaded: false,
           reason: `Clear · ${Math.round(sun.altDeg)}° sun`, geo: true };
}

function runShadowAnalysis(hour) {
  setShadowStatus('computing');
  const ok = loadBuildingCache();
  if (!ok) { setShadowStatus('unavailable'); return; }

  const newScores = {};
  for (const v of allVenues) {
    const r = computeGeometricShadow(v, hour);
    if (r) newScores[v.id] = r;
  }
  shadowScores = newScores;

  const geoN = Object.values(shadowScores).filter(s=>s.geo).length;
  setShadowStatus(geoN > 0 ? 'active' : 'unavailable', geoN);

  refreshVenueSource();
  updateUI(hour, mapboxSunDir(hour).altDeg, atmosphere(hour));
}

function scheduleShadowAnalysis(hour) {
  clearTimeout(shadowDebounce);
  shadowDebounce = setTimeout(() => runShadowAnalysis(hour), 700);
}

function setShadowStatus(state, count) {
  const dot = document.getElementById('shadow-dot');
  const lbl = document.getElementById('shadow-label');
  dot.className = '';
  if (state === 'active') {
    dot.classList.add('active');
    lbl.textContent = `🔬 Geo shadows · ${count} venues`;
  } else if (state === 'computing') {
    dot.classList.add('computing');
    lbl.textContent = 'Computing shadows…';
  } else {
    lbl.textContent = 'Directional scores (zoom in for geo)';
  }
}

// ═══════════════════════════════════════════════════
//  SUN VISUAL ELEMENT
// ═══════════════════════════════════════════════════

function sunPalette(alt) {
  if (alt <= 6) return {
    atmo:   'rgba(200,60,10,0.10)',
    corona: 'rgba(255,90,20,0.55)',
    ray:    'rgba(255,100,30,0.42)',
    disc1:  '#ffbb88', disc2: '#ff6622',
    flare:  'rgba(255,100,40,0.55)',
  };
  if (alt <= 18) return {
    atmo:   'rgba(255,140,30,0.09)',
    corona: 'rgba(255,180,60,0.52)',
    ray:    'rgba(255,190,60,0.40)',
    disc1:  '#ffeebb', disc2: '#ffaa22',
    flare:  'rgba(255,190,70,0.50)',
  };
  if (alt <= 40) return {
    atmo:   'rgba(255,210,80,0.07)',
    corona: 'rgba(255,228,120,0.46)',
    ray:    'rgba(255,225,100,0.36)',
    disc1:  '#ffffe0', disc2: '#ffee88',
    flare:  'rgba(255,235,130,0.42)',
  };
  return {
    atmo:   'rgba(240,248,255,0.06)',
    corona: 'rgba(255,255,235,0.40)',
    ray:    'rgba(255,255,210,0.30)',
    disc1:  '#ffffff',  disc2: '#fffff5',
    flare:  'rgba(255,255,230,0.36)',
  };
}

function getSunScreenPos(hour) {
  const sun    = mapboxSunDir(hour);
  const center = map.getCenter();

  const azRad = sun.azDeg * Math.PI / 180;
  const D     = 60000;
  const dLat  = (D * Math.cos(azRad)) / 111320;
  const dLng  = (D * Math.sin(azRad)) / (111320 * Math.cos(center.lat * Math.PI / 180));
  const hPx   = map.project([center.lng + dLng, center.lat + dLat]);

  const skyH = Math.max(hPx.y, 60);
  const y    = hPx.y - (Math.max(0, sun.altDeg) / 90) * skyH * 1.18;

  return { x: hPx.x, y: Math.max(8, y), alt: sun.altDeg };
}

function updateSunElement(hour) {
  const el  = document.getElementById('sun-el');
  const sun = mapboxSunDir(hour);
  const pos = getSunScreenPos(hour);

  const opacity = sun.altDeg >= 4 ? 1.0 : Math.max(0, (sun.altDeg + 5) / 9);
  el.style.opacity = opacity.toFixed(3);
  if (opacity === 0) return;

  el.style.left = pos.x + 'px';
  el.style.top  = pos.y + 'px';

  const sf = Math.max(0.65, 2.0 - sun.altDeg / 28);
  const discSz   = Math.round(46  * sf);
  const raysSz   = Math.round(94  * sf);
  const coronaSz = Math.round(125 * sf);
  const atmoSz   = Math.round(360 * sf);
  const flareW   = Math.round(Math.max(60, 280 * Math.max(0, 1 - sun.altDeg / 60)));
  const blurC    = Math.max(6, Math.round(coronaSz / 11));

  const c = sunPalette(sun.altDeg);

  const disc   = el.querySelector('.sun-disc');
  const rays   = el.querySelector('.sun-rays');
  const corona = el.querySelector('.sun-corona');
  const atmo   = el.querySelector('.sun-atmo');
  const flare  = el.querySelector('.sun-flare');

  atmo.style.cssText = `
    position:absolute;border-radius:50%;transform:translate(-50%,-50%);
    width:${atmoSz}px;height:${atmoSz}px;
    background:radial-gradient(circle,${c.atmo} 0%,transparent 65%);
    filter:blur(22px);`;

  corona.style.cssText = `
    position:absolute;border-radius:50%;transform:translate(-50%,-50%);
    width:${coronaSz}px;height:${coronaSz}px;
    background:radial-gradient(circle,${c.corona} 0%,transparent 70%);
    filter:blur(${blurC}px);`;

  rays.style.cssText = `
    position:absolute;border-radius:50%;transform:translate(-50%,-50%) rotate(0deg);
    width:${raysSz}px;height:${raysSz}px;
    background:repeating-conic-gradient(${c.ray} 0deg 3.5deg,transparent 3.5deg 45deg);
    animation:rays-spin 28s linear infinite;`;

  disc.style.cssText = `
    position:absolute;border-radius:50%;transform:translate(-50%,-50%);
    width:${discSz}px;height:${discSz}px;
    background:radial-gradient(circle,#fff 0%,${c.disc1} 32%,${c.disc2} 68%,transparent 100%);
    box-shadow:0 0 ${Math.round(discSz*0.55)}px ${Math.round(discSz*0.28)}px ${c.corona},
               0 0 ${Math.round(discSz*1.6)}px  ${Math.round(discSz*0.65)}px ${c.atmo};`;

  const flareOp = Math.max(0, 0.75 - sun.altDeg / 40).toFixed(2);
  flare.style.cssText = `
    position:absolute;border-radius:2px;transform:translate(-50%,-50%);
    height:1.5px;width:${flareW}px;
    background:linear-gradient(to right,transparent,${c.flare} 30%,rgba(255,255,255,0.75) 50%,${c.flare} 70%,transparent);
    animation:flare-pulse 4s ease-in-out infinite;
    opacity:${flareOp};`;
}

// ═══════════════════════════════════════════════════
//  COLOUR HELPERS
// ═══════════════════════════════════════════════════
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpHex(a, b, t) {
  const ah=parseInt(a.slice(1),16), bh=parseInt(b.slice(1),16);
  const [ar,ag,ab]=[ah>>16,(ah>>8)&0xff,ah&0xff];
  const [br,bg,bb]=[bh>>16,(bh>>8)&0xff,bh&0xff];
  const r=Math.round(lerp(ar,br,t)),g=Math.round(lerp(ag,bg,t)),bl=Math.round(lerp(ab,bb,t));
  return '#'+((r<<16)|(g<<8)|bl).toString(16).padStart(6,'0');
}
function scoreColor(s) {
  if (s < 30) return lerpHex('#334477','#4488ff',s/30);
  if (s < 55) return lerpHex('#4488ff','#ffaa22',(s-30)/25);
  if (s < 78) return lerpHex('#ffaa22','#ff6600',(s-55)/23);
  return             lerpHex('#ff6600','#ffdd22',(s-78)/22);
}

// ═══════════════════════════════════════════════════
//  ATMOSPHERE
// ═══════════════════════════════════════════════════
function atmosphere(h) {
  if (h < 6.4 || h >= 22) return {
    preset:'night', stars:0.92, gh:0,
    fog:'#07081e', highFog:'#0e1030', space:'#010106', horizon:0.32,
    ambC:'#223366', ambI:0.04, dirC:'#001133', dirI:0, sunI:0,
    name:'🌙 Night', nameC:'#5577cc',
  };
  if (h < 8) { const t=(h-6.4)/1.6; return {
    preset:'dawn', stars:Math.max(0,0.6-t*0.6), gh:t*0.1,
    fog:lerpHex('#ee6644','#ffccaa',t), highFog:lerpHex('#cc4488','#ff9944',t),
    space:'#01091a', horizon:0.18,
    ambC:lerpHex('#ff7744','#ffddaa',t), ambI:lerp(0.08,0.28,t),
    dirC:lerpHex('#ff6633','#fff4e0',t), dirI:lerp(0.1,0.6,t), sunI:lerp(3,16,t),
    name:'🌅 Sunrise', nameC:'#ff8844',
  };}
  if (h < 10) { const t=(h-8)/2; return {
    preset:'day', stars:0, gh:0,
    fog:lerpHex('#c8e4ff','#eef8ff',t), highFog:lerpHex('#88ccee','#55aadd',t),
    space:'#01091a', horizon:0.07,
    ambC:'#d4edff', ambI:lerp(0.32,0.42,t),
    dirC:'#fff9e8', dirI:lerp(0.62,0.78,t), sunI:lerp(16,20,t),
    name:'🌤 Morning', nameC:'#88ccee',
  };}
  if (h < 16) { const peak=Math.sin(((h-10)/6)*Math.PI); return {
    preset:'day', stars:0, gh:0,
    fog:'#eef4ff', highFog:'#88b4e8', space:'#01091a', horizon:0.05,
    ambC:'#e4f2ff', ambI:lerp(0.42,0.65,peak),
    dirC:'#fffeee', dirI:lerp(0.78,0.95,peak), sunI:lerp(20,26,peak),
    name:'☀️ Bright Midday', nameC:'#fffde0',
  };}
  if (h < 17.5) { const t=(h-16)/1.5; return {
    preset:'day', stars:0, gh:t*0.15,
    fog:lerpHex('#eef4ff','#ffd8aa',t), highFog:lerpHex('#88b4e8','#ff9933',t),
    space:'#01091a', horizon:0.09,
    ambC:lerpHex('#e4f2ff','#ffeedd',t), ambI:lerp(0.62,0.44,t),
    dirC:lerpHex('#fffeee','#ffcc55',t), dirI:lerp(0.95,0.78,t), sunI:lerp(26,20,t),
    name:'🌤 Late Afternoon', nameC:'#ffcc88',
  };}
  if (h < 19.8) { const t=(h-17.5)/2.3; return {
    preset:'dusk', stars:t>0.55?(t-0.55)*0.45:0, gh:lerp(0.55,0.08,t),
    fog:lerpHex('#ffcc88','#882244',t), highFog:lerpHex('#ff8833','#551133',t),
    space:lerpHex('#01091a','#010810',t), horizon:lerp(0.12,0.26,t),
    ambC:lerpHex('#ffeecc','#774466',t), ambI:Math.max(0.04,lerp(0.44,0.06,t)),
    dirC:lerpHex('#ffcc55','#ff5522',t), dirI:Math.max(0,lerp(0.78,0,t)),
    sunI:Math.max(0,lerp(20,0,t)),
    name:t<0.6?'🌇 Golden Hour ✨':'🌆 Sunset', nameC:t<0.6?'#ffcc44':'#ff6633',
  };}
  if (h < 21.5) { const t=(h-19.8)/1.7; return {
    preset:'night', stars:lerp(0.28,0.8,t), gh:0,
    fog:lerpHex('#441133','#0d0820',t), highFog:lerpHex('#220d33','#09051e',t),
    space:lerpHex('#05050f','#010106',t), horizon:lerp(0.26,0.32,t),
    ambC:lerpHex('#441166','#223355',t), ambI:Math.max(0.03,lerp(0.09,0.03,t)),
    dirC:'#111122', dirI:0, sunI:0,
    name:'🌇 Twilight', nameC:'#885599',
  };}
  return {
    preset:'night', stars:0.92, gh:0,
    fog:'#07081e', highFog:'#0e1030', space:'#010106', horizon:0.32,
    ambC:'#223366', ambI:0.04, dirC:'#001133', dirI:0, sunI:0,
    name:'🌃 Night', nameC:'#5577cc',
  };
}

// ═══════════════════════════════════════════════════
//  GEOJSON  (uses geo shadow scores when available)
// ═══════════════════════════════════════════════════
function buildGeoJSON(venues, hour) {
  return {
    type: 'FeatureCollection',
    features: venues.map(v => {
      const geo   = shadowScores[v.id];
      const score = geo?.score ?? calcScore(v, hour);
      return {
        type: 'Feature',
        geometry: { type:'Point', coordinates:[v.lng, v.lat] },
        properties: {
          id:v.id, name:v.name, type:v.type, hood:v.hood||'NYC',
          score, color:scoreColor(score),
          geoVerified: !!geo?.geo,
          shaded:      geo?.shaded ?? null,
          reason:      geo?.reason ?? '',
        }
      };
    })
  };
}

// ═══════════════════════════════════════════════════
//  MAP INIT
// ═══════════════════════════════════════════════════
mapboxgl.accessToken = MAPBOX_TOKEN;
map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/standard',
  center: [NYC.lng, NYC.lat],
  zoom: 13.6,
  pitch: 58,
  bearing: -12,
  antialias: true,
  preserveDrawingBuffer: true,
});
map.addControl(new mapboxgl.NavigationControl({ showCompass:true }), 'top-right');

map.on('error', e => {
  if (e?.error?.status === 401 || e?.error?.message?.includes('401')) {
    const ld = document.getElementById('loading');
    ld.innerHTML = `
      <div style="text-align:center;padding:40px;max-width:380px">
        <div style="font-size:52px;margin-bottom:18px">🔑</div>
        <h2 style="margin-bottom:10px">Mapbox Token Required</h2>
        <p style="color:rgba(255,255,255,0.55);line-height:1.6;margin-bottom:18px">
          Add your token to <code style="color:#ffcc44">.env</code> as
          <code style="color:#ffcc44">VITE_MAPBOX_TOKEN</code>.
        </p>
        <a href="https://account.mapbox.com/access-tokens/" target="_blank"
           style="display:inline-block;padding:10px 20px;background:#ffcc44;color:#000;
                  font-weight:700;border-radius:8px;text-decoration:none;">
          Get Free Token →
        </a>
      </div>`;
    ld.style.opacity='1'; ld.style.display='flex';
  }
});

map.on('move', () => { updateSunElement(currentHour); });

// ═══════════════════════════════════════════════════
//  MAP LOAD
// ═══════════════════════════════════════════════════
map.on('load', () => {
  map.addSource('venues', { type:'geojson', data:buildGeoJSON(filteredVenues(), currentHour) });

  map.addLayer({
    id:'venues-glow', type:'circle', source:'venues',
    paint: {
      'circle-radius':  ['interpolate',['linear'],['get','score'], 0,10, 100,28],
      'circle-color':   ['get','color'],
      'circle-opacity': 0.20,
      'circle-blur':    1.9,
    }
  });

  map.addLayer({
    id:'venues-main', type:'circle', source:'venues',
    paint: {
      'circle-radius':       ['interpolate',['linear'],['get','score'], 0,5, 100,14],
      'circle-color':        ['get','color'],
      'circle-opacity':      0.92,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': 'rgba(255,255,255,0.45)',
    }
  });

  map.addLayer({
    id:'sky', type:'sky',
    paint: {
      'sky-type': 'atmosphere',
      'sky-atmosphere-sun': [0, 30],
      'sky-atmosphere-sun-intensity': 15,
      'sky-opacity': ['interpolate',['exponential',1.5],['zoom'],0,0,5,0.3,10,1],
    }
  });

  map.on('click','venues-main', e => {
    const p = e.features[0].properties;
    const [lng, lat] = e.features[0].geometry.coordinates;
    if (popup) popup.remove();
    const shadowLine = p.reason
      ? `<div style="display:flex;align-items:center;gap:5px;margin-top:6px">
           <span style="font-size:11px">${p.shaded?'🌑':'☀️'}</span>
           <span style="font-size:10px;color:${p.shaded?'#88aaff':'#66ddaa'}">${p.geoVerified?'🔬 ':' '}${p.reason}</span>
         </div>`
      : '';
    popup = new mapboxgl.Popup({ offset:16, closeButton:true })
      .setLngLat([lng, lat])
      .setHTML(`
        <div>
          <div style="font-weight:800;font-size:14px;margin-bottom:4px">${p.name}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:10px">
            ${p.hood} · ${typeIcon(p.type)} ${p.type}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden">
              <div style="width:${p.score}%;height:100%;background:${p.color};border-radius:2px"></div>
            </div>
            <span style="font-weight:800;font-size:16px;color:${p.color}">${p.score}</span>
          </div>
          ${shadowLine}
          <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:7px">${currentTimeLabel()}</div>
        </div>
      `)
      .addTo(map);
  });

  map.on('mouseenter','venues-main', () => map.getCanvas().style.cursor='pointer');
  map.on('mouseleave','venues-main', () => map.getCanvas().style.cursor='');

  map.on('idle', () => {
    scheduleShadowAnalysis(currentHour);
  });

  renderNeighborhoodOptions();
  document.getElementById('slider').value = currentHour;
  applyScene(currentHour);

  setTimeout(() => {
    const ld = document.getElementById('loading');
    ld.style.opacity = '0';
    setTimeout(() => ld.style.display = 'none', 1200);
  }, 1400);

  fetchOSM();
});

// ═══════════════════════════════════════════════════
//  APPLY SCENE
// ═══════════════════════════════════════════════════
function applyScene(hour) {
  currentHour = hour;
  const atmo = atmosphere(hour);
  const sun  = mapboxSunDir(hour);

  try { map.setConfigProperty('basemap','lightPreset', atmo.preset); } catch(_){}

  const lights = [{
    id:'environment', type:'ambient',
    properties:{ color:atmo.ambC, intensity:atmo.ambI }
  }];
  if (atmo.dirI > 0.01) lights.push({
    id:'sun', type:'directional',
    properties:{
      color:atmo.dirC, intensity:atmo.dirI, direction:sun.dir,
      'cast-shadows':true, 'shadow-intensity':Math.min(0.92, atmo.dirI*1.1)
    }
  });
  try { map.setLights(lights); } catch(_){}

  try {
    map.setPaintProperty('sky','sky-atmosphere-sun', sun.dir);
    map.setPaintProperty('sky','sky-atmosphere-sun-intensity', atmo.sunI || 0.5);
  } catch(_){}

  try {
    map.setFog({
      range:[1,12], color:atmo.fog, 'high-color':atmo.highFog,
      'space-color':atmo.space, 'horizon-blend':atmo.horizon,
      'star-intensity':atmo.stars,
    });
  } catch(_){}

  refreshVenueSource();
  updateSunElement(hour);
  scheduleShadowAnalysis(hour);

  document.getElementById('gh-glow').style.opacity = atmo.gh;
  document.getElementById('stars-overlay').style.opacity =
    atmo.stars > 0.3 ? (atmo.stars * 0.6).toFixed(2) : '0';

  updateUI(hour, sun.altDeg, atmo);
}

// ═══════════════════════════════════════════════════
//  UI UPDATE
// ═══════════════════════════════════════════════════
function updateUI(hour, altDeg, atmo) {
  const h=Math.floor(hour), m=Math.round((hour%1)*60);
  const pm=h>=12?'PM':'AM', h12=h%12||12;
  document.getElementById('time-val').textContent = `${h12}:${String(m).padStart(2,'0')} ${pm}`;
  document.getElementById('time-sub').textContent = `— ${atmo.name}`;
  document.getElementById('date-label').textContent = formatDateLabel();

  const badge = document.getElementById('period-badge');
  badge.textContent = atmo.name;
  badge.style.background  = atmo.nameC+'22';
  badge.style.borderColor = atmo.nameC+'55';
  badge.style.color       = atmo.nameC;

  const pct = Math.max(0, Math.min(100, (altDeg/62)*100));
  document.getElementById('alt-fill').style.width = pct+'%';
  document.getElementById('alt-val').textContent  = altDeg > 0 ? `${Math.round(altDeg)}°` : 'horizon';

  const slPct = (hour/23)*100;
  document.getElementById('slider').style.background =
    `linear-gradient(to right,rgba(255,204,68,0.35) ${slPct}%,rgba(255,255,255,0.08) ${slPct}%)`;

  const scored = filteredVenues().map(v => {
    const geo   = shadowScores[v.id];
    const score = geo?.score ?? calcScore(v, hour);
    return { ...v, score, geo };
  }).sort((a,b) => b.score - a.score);

  const medals = ['🥇','🥈','🥉'];
  document.getElementById('venue-list').innerHTML = scored.length
    ? scored.slice(0,8).map((v,i) => {
        const shadedClass = v.geo?.shaded ? ' shaded' : '';
        const shadowBadge = v.geo
          ? `<span class="vi-badge ${v.geo.shaded?'shade-badge':'sun-badge'}">${v.geo.shaded?'🌑 shaded':'☀️ direct'}</span>
             <span class="vi-badge geo-badge">🔬</span>`
          : '';
        const reason = v.geo?.reason
          ? `<div class="vi-reason">${v.geo.reason}</div>` : '';
        return `
          <div class="vi${i<3?' top':''}${shadedClass}" onclick="flyTo(${v.lng},${v.lat})">
            <div class="vi-head">
              <div class="vi-name">${medals[i]?medals[i]+' ':''}${v.name}</div>
              <div class="vi-score" style="color:${scoreColor(v.score)}">${v.score}</div>
            </div>
            <div class="vi-meta">
              <span class="vi-hood">${v.hood}</span>
              <span class="vi-badge">${typeIcon(v.type)} ${v.type}</span>
              ${shadowBadge}
            </div>
            ${reason}
            <div class="score-track">
              <div class="score-fill" style="width:${v.score}%;background:${scoreColor(v.score)}"></div>
            </div>
          </div>`;
      }).join('')
    : `<div class="vi"><div class="vi-name">No venues match this neighborhood.</div></div>`;
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════
function typeIcon(t) { return {rooftop:'🏙️',garden:'🌿',patio:'🍺'}[t]||'📍'; }

// exposed to onclick in HTML template strings
window.flyTo = function flyTo(lng, lat) {
  map.flyTo({ center:[lng,lat], zoom:16, pitch:62, duration:1400, essential:true });
};

// ═══════════════════════════════════════════════════
//  OSM LIVE DATA
// ═══════════════════════════════════════════════════
async function fetchOSM() {
  const bbox = '40.65,-74.02,40.80,-73.90';
  const q = `[out:json][timeout:30];
(
  node["amenity"="bar"]["outdoor_seating"="yes"](${bbox});
  node["amenity"="pub"]["outdoor_seating"="yes"](${bbox});
  node["amenity"="restaurant"]["outdoor_seating"="yes"](${bbox});
);
out;`;
  try {
    const res  = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', body:'data='+encodeURIComponent(q) });
    const data = await res.json();
    const osmVenues = data.elements
      .filter(el => el.tags?.name && el.lat && el.lon)
      .map(el => ({
        id:`osm_${el.id}`, name:el.tags.name,
        type:'patio', lat:el.lat, lng:el.lon,
        hood:el.tags['addr:suburb']||el.tags['addr:neighbourhood']||'NYC',
        facing:guessFacing(el.lat, el.lon),
      }));
    const merged = [...CURATED];
    for (const osm of osmVenues) {
      const dup = merged.some(v => Math.abs(v.lat-osm.lat)<0.0005 && Math.abs(v.lng-osm.lng)<0.0005);
      if (!dup) merged.push(osm);
    }
    allVenues = merged;
    renderNeighborhoodOptions();
    refreshVenueSource();
    updateUI(currentHour, mapboxSunDir(currentHour).altDeg, atmosphere(currentHour));
    document.getElementById('osm-label').textContent = `${allVenues.length} venues loaded`;
    document.getElementById('osm-dot').style.background = '#44cc88';
    scheduleShadowAnalysis(currentHour);
  } catch(err) {
    document.getElementById('osm-label').textContent = `${CURATED.length} curated venues`;
    document.getElementById('osm-dot').style.background = '#ffaa44';
  }
}
function guessFacing(lat, lng) {
  const opts = ['south','south','west','west','east','south','west','all'];
  return opts[Math.abs(Math.round(lat*1337+lng*997))%opts.length];
}

// ═══════════════════════════════════════════════════
//  STARS
// ═══════════════════════════════════════════════════
(function initStars() {
  const el = document.getElementById('stars-overlay');
  for (let i=0; i<90; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = Math.random()*2.5+0.5;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*65}%;--dur:${(2+Math.random()*3).toFixed(1)}s;--del:${(Math.random()*4).toFixed(1)}s;`;
    el.appendChild(s);
  }
})();

// ═══════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════
document.getElementById('slider').addEventListener('input', e => {
  const hour = parseFloat(e.target.value);
  if (rafPending) cancelAnimationFrame(rafPending);
  rafPending = requestAnimationFrame(() => { applyScene(hour); rafPending=null; });
});

document.getElementById('hood-filter').addEventListener('change', e => {
  selectedNeighborhood = e.target.value;
  refreshVenueSource();
  updateUI(currentHour, mapboxSunDir(currentHour).altDeg, atmosphere(currentHour));
});

document.addEventListener('keydown', e => {
  const sl = document.getElementById('slider');
  let h = parseFloat(sl.value);
  if      (e.key==='ArrowRight') h=Math.min(23,h+0.25);
  else if (e.key==='ArrowLeft')  h=Math.max(0,h-0.25);
  else return;
  sl.value=h; applyScene(h);
});
