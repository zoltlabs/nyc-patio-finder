# Daylight Maxxing

**Brand name:** Daylight Maxxing
**Domain:** daylightmaxxing.com
**GitHub:** https://github.com/zoltlabs/nyc-patio-finder
**Vercel:** https://nyc-patio-finder.vercel.app (rename pending)

## What it is
A real-time web app that shows which NYC bar patios, rooftops, and restaurant gardens are getting the best sunlight right now. Uses real 3D building geometry to compute shadow coverage by raycasting against actual building heights.

## Tech stack
- **Vite** — build tool, local dev server
- **Mapbox GL JS v3** — 3D Standard style map, `setLights()`, `setFog()`, sky layer
- **SunCalc** — sun azimuth/altitude for any time of day
- **Overpass API** — live OSM venue data (`outdoor_seating=yes`)
- **Geometric shadow scoring** — `querySourceFeatures('composite', { sourceLayer: 'building' })` + raycasting

## Key env var
`VITE_MAPBOX_TOKEN` — set in `.env` locally, and in Vercel project settings for production.
Token should have URL restriction set to the production domain once live.

## Visual Identity: "The Sun Seeker's Journal"
A sophisticated, urban magazine aesthetic that celebrates NYC daylight.

### Core Principles
- **Atmospheric Responsiveness:** The UI accent color (`--period-color`) and glass textures dynamically transition based on the sun's position (e.g., warm gold at midday, deep amber at sunset, cool indigo at night).
- **Refined Typography:** A high-contrast mix of **Charter** (italic serif) for storytelling and names, paired with a **heavy geometric sans** for "NYC" and technical data.
- **Precision Glassmorphism:** Ultra-thin `0.5px` borders, high-blur backdrops (`24px`), and dynamic shadows that make the UI feel like physical layers of light.

### UI Terminology
- **The Zenith:** Midday/Peak Sun
- **The Glow:** Golden Hour
- **The Fade:** Twilight

## Commands
```
npm run dev      # local dev
npm run build    # production build
vercel --prod    # deploy to production
```
