# React + TypeScript Migration Plan

## Goal

Migrate the current Vite app from plain JavaScript + direct DOM manipulation to React + TypeScript with minimal behavioral drift, low debugging overhead, and a clear validation path at each step.

This plan is designed around the current app structure:

- `index.html` contains the static shell and mount markup
- `src/main.js` contains all runtime logic: state, map orchestration, scoring, UI rendering, and event wiring
- `src/style.css` contains all visual styling

## Current State Summary

The app is already a Vite project, but it is effectively a single-module client app with these characteristics:

- Global mutable state drives UI and map behavior
- DOM is updated via `document.getElementById`, `innerHTML`, and global `window.flyTo`
- Mapbox and shadow analysis are tightly coupled to UI rendering
- UI sections already map well to future React components:
  - loading overlay
  - sidebar
  - neighborhood filter
  - shadow status
  - venue list
  - time panel
  - legend
  - OSM status badge
  - sun overlay

The migration should preserve behavior first, then improve structure.

## Non-Goals For The Initial Migration

To avoid unnecessary debugging during the cutover, the first migration should not try to redesign the product at the same time.

Do not combine the migration with:

- visual rebrand or light-theme overhaul
- API/data model expansion
- state management library adoption
- routing
- backend work
- UI framework adoption
- large CSS rewrite

## Recommended Target Stack

- Vite with React + TypeScript
- TypeScript in strict mode
- React 18 or current Vite default React version
- Keep CSS as plain CSS initially
- Keep Mapbox and SunCalc
- Add ESLint and TypeScript type-checking as part of the migration

Recommended dependencies:

- `react`
- `react-dom`
- `typescript`
- `@types/react`
- `@types/react-dom`
- `@vitejs/plugin-react`

Recommended scripts:

- `dev`
- `build`
- `preview`
- `typecheck`
- `lint`

## Migration Principles

1. Preserve behavior before improving architecture.
2. Move state into React incrementally, but keep imperative Mapbox control isolated.
3. Avoid rewriting map logic and UI logic in the same step.
4. Introduce explicit TypeScript types before splitting deeply into components.
5. Keep one source of truth for app state.
6. Add validation gates after every phase.

## Proposed Target File Structure

```text
src/
  main.tsx
  App.tsx
  style.css
  types/
    venue.ts
    map.ts
    atmosphere.ts
  data/
    curatedVenues.ts
  lib/
    sun.ts
    scoring.ts
    shadows.ts
    osm.ts
    colors.ts
    time.ts
  hooks/
    usePatioAppState.ts
    useMapboxPatioMap.ts
    useShadowAnalysis.ts
  components/
    LoadingOverlay.tsx
    SunOverlay.tsx
    Sidebar.tsx
    NeighborhoodFilter.tsx
    ShadowStatus.tsx
    VenueList.tsx
    VenueListItem.tsx
    TimePanel.tsx
    Legend.tsx
    StatusBadge.tsx
    MapCanvas.tsx
```

This structure is intentionally conservative. It separates concerns without forcing too many abstractions on day one.

## Type System Plan

Define types before deep refactoring. At minimum:

### Core domain types

```ts
type VenueType = 'rooftop' | 'garden' | 'patio';

type Facing =
  | 'all'
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest';

interface Venue {
  id: string;
  name: string;
  type: VenueType;
  lat: number;
  lng: number;
  hood: string;
  facing: Facing;
}

interface ShadowScore {
  score: number;
  shaded: boolean;
  reason: string;
  geo: boolean;
}

interface VenueWithScore extends Venue {
  score: number;
  geo?: ShadowScore;
}
```

### UI and derived state types

```ts
interface AtmosphereState {
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

type ShadowStatusState = 'active' | 'computing' | 'unavailable';
```

### External boundary types

Keep external types narrow and local:

- Mapbox map refs and feature payloads
- Overpass response types for the fields actually used

## Phased Migration Plan

## Phase 0: Stabilize Before Migration

### Objective

Reduce surprises before introducing React.

### Tasks

- Confirm the current app builds cleanly with `vite build`
- Capture current expected behavior in a short checklist
- Identify current runtime invariants:
  - map loads
  - current day label renders
  - slider changes scores and atmosphere
  - neighborhood filter narrows markers and list
  - OSM fetch fallback still works
  - shadow analysis status updates
  - popups open correctly

### Deliverables

- baseline behavior checklist
- green build before migration

### Exit criteria

- current app behavior is understood and documented

## Phase 1: Convert Tooling To React + TypeScript

### Objective

Switch the Vite app to React + TypeScript without changing app behavior yet.

### Tasks

- install React and TypeScript dependencies
- add Vite React plugin
- create `tsconfig.json`
- convert Vite entry from `src/main.js` to `src/main.tsx`
- create a minimal `App.tsx`
- keep `index.html` as a simple mount root only
- move the existing static shell markup into React JSX, even if still monolithic at first

### Notes

At the end of this phase, it is acceptable for `App.tsx` to still be large. The purpose is to establish the runtime and type system first.

### Deliverables

- React-powered Vite app
- TypeScript build config
- `main.tsx` + `App.tsx`

### Exit criteria

- dev server runs
- production build succeeds
- no behavior regression beyond minor DOM structure differences

## Phase 2: Extract Pure Logic Into Typed Utility Modules

### Objective

Separate computation from rendering before componentizing too aggressively.

### Tasks

- move curated venue data into `src/data/curatedVenues.ts`
- extract pure helpers from current `main.js` into typed modules:
  - `lib/time.ts`
  - `lib/sun.ts`
  - `lib/colors.ts`
  - `lib/scoring.ts`
  - `lib/shadows.ts`
  - `lib/osm.ts`
- keep all extracted functions free of DOM dependencies
- add explicit return types for public helpers

### Notes

This phase is important because it reduces debugging risk. Pure functions are much easier to validate than component behavior tied directly to Mapbox and the DOM.

### Deliverables

- small typed modules for domain logic
- reduced logic burden inside `App.tsx`

### Exit criteria

- app still behaves the same
- logic compiles under TypeScript with no `any` leaks in core modules

## Phase 3: Define App State Boundaries

### Objective

Replace global mutable state with React state and refs in a controlled way.

### State to move into React

- `allVenues`
- `selectedNeighborhood`
- `currentHour`
- `shadowScores`
- shadow status text/state
- loading visibility state
- OSM status text/state

### State to keep in refs

- Mapbox map instance
- popup instance
- debounce timer ids
- cached building features
- animation frame ids

### Tasks

- create a top-level app state shape in `App.tsx` or `usePatioAppState.ts`
- replace direct DOM updates with derived JSX props
- keep imperative side effects in `useEffect`

### Notes

This is the phase where the app becomes maintainable. The key is not to over-separate too early. One custom hook for app state is enough initially.

### Deliverables

- no UI state stored in globals
- refs used only for imperative integrations

### Exit criteria

- UI updates are driven by state rather than `innerHTML`
- slider and filter updates still work correctly

## Phase 4: Isolate Mapbox Integration

### Objective

Keep React declarative while acknowledging that Mapbox is imperative.

### Tasks

- create a `MapCanvas.tsx` component that only owns the map container
- create a `useMapboxPatioMap.ts` hook to:
  - initialize the map once
  - add sources/layers
  - update source data when scored venues change
  - update atmosphere, fog, lights, and sun direction
  - attach click and hover handlers
  - manage popup lifecycle
- expose a narrow interface back to the app:
  - `flyToVenue`
  - `refreshMapSource`
  - `onMapIdle`
  - `mapReady`

### Critical rule

React should not recreate the map on normal rerenders.

### Deliverables

- Mapbox lifecycle isolated from UI rendering

### Exit criteria

- map initializes once
- map is not destroyed/recreated during slider/filter changes
- popup behavior still works

## Phase 5: Replace String-Based UI Rendering With Components

### Objective

Remove `innerHTML` and manual DOM assembly.

### Components to introduce

- `LoadingOverlay`
- `Sidebar`
- `NeighborhoodFilter`
- `ShadowStatus`
- `VenueList`
- `VenueListItem`
- `TimePanel`
- `Legend`
- `StatusBadge`
- `SunOverlay`

### Tasks

- render venue cards through JSX
- pass click handlers via props instead of global `window.flyTo`
- render empty states declaratively
- render popup content either as HTML string from typed data or as a minimal templating helper

### Notes

For popup content, keep the first version pragmatic. You do not need React portals into Mapbox popups immediately if that increases migration risk.

### Deliverables

- no `innerHTML` for venue list rendering
- no global `window.flyTo`

### Exit criteria

- all visible UI sections render from React components
- venue selection interactions still work

## Phase 6: Reconcile Effects And Derived Data

### Objective

Prevent subtle bugs from duplicated calculations and stale closures.

### Tasks

- centralize derived values:
  - filtered venues
  - scored venues
  - current atmosphere
  - current sun direction
  - date label
- use `useMemo` only where computation is meaningfully repeated and inputs are clear
- use refs for debounce and map handles
- ensure effects have explicit dependencies

### Risks to avoid

- duplicate shadow analysis scheduling
- stale `currentHour` in debounced analysis
- map updates using out-of-date scored venue data
- rerender loops caused by map event listeners setting state too frequently

### Deliverables

- predictable state flow
- fewer hidden coupling points

### Exit criteria

- no duplicated side effects
- no obvious stale state issues during fast slider movement

## Phase 7: Add Safety Nets

### Objective

Make debugging easier before future feature work starts.

### Tasks

- enable strict TypeScript checks
- add ESLint
- add a `typecheck` script
- add at least a small test layer around pure utilities:
  - time rounding
  - atmosphere buckets
  - directional score calculation
  - neighborhood filtering
- optionally add one light integration test later, but do not block migration on full test coverage

### Deliverables

- static validation in CI-ready form
- basic tests on critical pure logic

### Exit criteria

- project can be validated with `build`, `typecheck`, and tests

## Detailed Implementation Order

This is the order I would actually use to minimize debugging.

1. Add React + TypeScript tooling only.
2. Move HTML shell into `App.tsx` without changing behavior.
3. Convert `main.js` to `main.tsx` and make the app compile.
4. Add shared type definitions.
5. Extract curated data and pure utility modules.
6. Move UI state into React state.
7. Keep Mapbox imperative code in one place while the UI still renders in React.
8. Replace venue list `innerHTML` with React components.
9. Remove `window.flyTo`.
10. Extract sidebar, time panel, legend, and status components.
11. Add typecheck/lint/test scripts.
12. Run a final regression pass.

## Validation Checklist

This checklist should be run after each major phase, not just at the end.

### App boot

- app mounts without console errors
- loading overlay appears and dismisses
- missing Mapbox token path still shows the correct recovery message

### Map behavior

- map initializes once
- venue markers appear
- marker hover cursor works
- marker click opens popup
- popup content matches current score

### Time behavior

- app starts at the current quarter-hour
- slider updates time label
- slider updates atmosphere
- slider updates venue rankings
- left/right keyboard controls still work

### Data behavior

- current date label renders as today
- OSM fetch succeeds when network is available
- OSM failure falls back cleanly
- neighborhood dropdown populates after OSM merge

### Scoring behavior

- directional score still works before geo analysis completes
- shadow analysis status changes from loading/computing to active or fallback
- geo shadow results update ranked venues
- shaded venues visually differ from direct-sun venues

### UI behavior

- venue list rerenders without flicker or stale entries
- selecting a neighborhood filters both list and map
- selecting a venue card flies the map to the venue
- empty neighborhood state renders correctly

### Build behavior

- `vite build` succeeds
- TypeScript passes
- no unused `any`-heavy escape hatches in new code

## Known Migration Risks And Mitigations

## Risk 1: Mapbox lifecycle bugs

### Failure mode

Map is recreated on rerender or handlers get bound multiple times.

### Mitigation

- hold the map instance in a ref
- initialize only once in an effect with an empty dependency list
- separate setup effects from update effects

## Risk 2: Stale closure bugs in delayed shadow analysis

### Failure mode

Debounced analysis uses old hour or stale venue state.

### Mitigation

- keep debounce timer in a ref
- pass the target hour explicitly into the scheduled function
- do not read mutable globals from inside delayed callbacks

## Risk 3: UI and map state diverge

### Failure mode

The list shows one set of venues but the map shows another.

### Mitigation

- compute filtered/scored venues once from shared state
- feed the same derived data to both React UI and map updates

## Risk 4: Over-componentization too early

### Failure mode

Migration becomes harder because code is split before responsibilities are clear.

### Mitigation

- start with a larger `App.tsx`
- extract components only after types and state flow are stable

## Risk 5: TypeScript friction from external libraries

### Failure mode

Mapbox and Overpass data typing slows migration.

### Mitigation

- type only the fields actually consumed
- isolate third-party interop at the edges
- avoid attempting exhaustive Mapbox typings during the first pass

## Suggested Definition Of Done

The migration is complete when all of the following are true:

- app runs on React + TypeScript
- no major user-facing regressions exist
- `src/main.js` no longer exists
- app state is not driven by DOM queries and global mutable UI state
- venue list is rendered with JSX components
- Mapbox logic is isolated behind a hook or contained module
- build, typecheck, and at least core logic tests pass

## Suggested Follow-Up After Migration

Only after the migration is stable:

1. Re-theme the app visually for the `Light` brand direction.
2. Improve accessibility with semantic buttons, focus styles, and keyboard support.
3. Expand venue metadata and recommendation quality.
4. Add a more deliberate mobile layout.

## Recommendation

Proceed with the migration, but do it as a controlled refactor rather than a rewrite.

The safest implementation strategy is:

- same product behavior
- new runtime and typing first
- state cleanup second
- component extraction third
- quality gates throughout

That sequence will minimize debugging and make future growth much easier.
