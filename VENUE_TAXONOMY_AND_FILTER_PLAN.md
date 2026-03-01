# Venue Taxonomy And Filter Plan

## Goal

Evolve the current "recommended spots" product from a mostly sun-first venue ranker into a sun-first decision tool that also answers:

- What kind of place is this?
- What kind of outdoor experience is this?
- Which of these are relevant to where I am looking right now?

This plan is designed for the current codebase, where:

- `src/types/venue.ts` uses `type` for outdoor format: `rooftop | garden | patio`
- `src/data/curatedVenues.ts` stores curated venues with only one venue classification axis
- `src/lib/osm.ts` imports live OSM venues from a narrow set of amenity types
- `src/hooks/usePatioAppState.ts` currently supports neighborhood filtering
- `src/App.tsx` and `src/hooks/useMapboxPatioMap.ts` now support viewport-aware filtering and map/list synchronization

The product question is not simply "should we let users filter by more things?" The better question is: what jobs are users trying to get done, and which classification system best supports those jobs?

## Jobs To Be Done

### Primary jobs

1. Find the best sunny place right now.
2. Find a sunny place for a specific future time.
3. Find a sunny place that matches the user's plan.
4. Find a sunny place that is practical relative to where the user is already looking.

### What "matches the plan" actually means

Users do not think in a single filter dimension. They usually mean one of these:

- "I want coffee."
- "I want drinks."
- "I want dinner."
- "I want a rooftop."
- "I want a quiet garden."
- "I want something in this neighborhood."
- "I want something in the area I am already viewing on the map."

That means the useful classification model needs at least these distinct axes:

1. Business category
2. Outdoor setting
3. Geographic context

The current app only handles #2 and parts of #3.

## Recommendation

Do not overload the current `type` field to mean both venue business type and outdoor format.

Instead:

1. Keep the existing `type` concept, but rename it in the domain model and UI.
2. Add a second explicit classification axis for business category.
3. Keep neighborhood and "in current map view" as context filters.

This gives users a filter model that maps to real decisions:

- Category: "What kind of place do I want?"
- Outdoor setting: "What kind of outdoor experience do I want?"
- Neighborhood / Map view: "Where is it practical for me to go?"

## Proposed Taxonomy

### Axis 1: Business category

This answers: "What kind of business is this?"

Recommended initial categories:

```ts
type VenueCategory =
  | 'bar'
  | 'restaurant'
  | 'cafe'
  | 'brewery';
```

Notes:

- `bar`: bars, pubs, cocktail spots (includes hotel rooftop bars like Westlight, Press Lounge)
- `restaurant`: restaurants primarily oriented around meals
- `cafe`: coffee shops, cafes, bakeries with meaningful seating
- `brewery`: breweries, taprooms, beer halls

Deliberately excluded for the first version:

- `hotel`: hotel rooftop destinations should be categorized by their primary function (bar, restaurant) rather than their parent business. The outdoor experience is already captured by `outdoorSetting: 'rooftop'`.
- `event`: venues like Pier 17 are too few in number (~1-2) to justify a filter option. Add when there is critical mass (≥3 venues).
- `store`
- `coworking`
- `park`
- `generic hospitality`

Reason:

- They do not appear strongly in the current product concept.
- They would expand the scope away from patios / hospitality / food / drink.
- `hotel` and `event` can be revisited in a later version once the basic filter model is validated.
- OSM support would be weak or noisy without broader query and cleanup work.

### Axis 2: Outdoor setting

This answers: "What kind of outdoor experience is this?"

Recommended model:

```ts
type OutdoorSetting = 'rooftop' | 'garden' | 'patio';
```

This is what the current `type` field already represents.

Recommendation:

- Keep these values.
- Rename the field from `type` to `outdoorSetting`.
- Rename the UI label to `Outdoor setting`.

Suggested end-user copy:

- `rooftop`: rooftop / terrace
- `garden`: courtyard / beer garden / garden
- `patio`: patio / sidewalk / street-level outdoor seating

Optional later refinement:

```ts
type OutdoorSetting = 'rooftop' | 'garden' | 'patio' | 'terrace';
```

But do not add `terrace` in the first pass unless curated data truly supports it.

### Axis 3: Context filters

This answers: "What is practical for me right now?"

Keep and improve:

- `Neighborhood`
- `Only show places in current map view`
- `Fit map to listed places`

Potential later additions:

- `Near me`
- `Near destination`
- `Walking distance`

These should be later phases, not part of the first taxonomy refactor.

## Proposed Data Model

### New venue interface

```ts
type OutdoorSetting = 'rooftop' | 'garden' | 'patio';

type VenueCategory =
  | 'bar'
  | 'restaurant'
  | 'cafe'
  | 'brewery';

interface Venue {
  id: string;
  name: string;
  outdoorSetting: OutdoorSetting;
  category: VenueCategory;
  lat: number;
  lng: number;
  hood: string;
  facing: Facing;
}
```

### Why this structure is correct

- `category` answers intent
- `outdoorSetting` answers experience
- both can be combined without ambiguity

Examples:

- `category: 'bar'`, `outdoorSetting: 'rooftop'` (e.g., Westlight, Press Lounge)
- `category: 'restaurant'`, `outdoorSetting: 'patio'`
- `category: 'cafe'`, `outdoorSetting: 'garden'`
- `category: 'brewery'`, `outdoorSetting: 'patio'`

This is much better than making `type` try to mean both "bar" and "rooftop."

## Suggested Curated Mapping

Initial curated category mapping should be explicit and hand-authored.

Examples from the current curated list:

- `230 Fifth Rooftop` -> `bar`
- `Westlight (William Vale)` -> `bar`
- `1 Hotel Brooklyn Bridge` -> `bar`
- `The Press Lounge` -> `bar`
- `Gallow Green` -> `bar`
- `Alma Restaurant` -> `restaurant`
- `Employees Only` -> `bar`
- `Maison Premiere` -> `bar`
- `Threes Brewing` -> `brewery`
- `Rooftop at Pier 17` -> `bar` (recategorize if `event` is added later)
- `LIC Bar` -> `bar`
- `Bar Cima at Grayson Hotel` -> `bar`

Important:

- Some venues are ambiguous.
- The product should pick a primary category, not attempt multi-category support initially.
- If ambiguity matters later, add `categories: VenueCategory[]`, but do not start there.

## OSM / Live Data Strategy

### Current state

`src/lib/osm.ts` only queries:

- `bar`
- `pub`
- `restaurant`

All imported OSM venues are currently normalized to:

- `type: 'patio'`

That is too lossy for category-based filtering.

### First-pass normalization strategy

Keep the import narrow, but map amenity tags into categories.

Recommended mapping:

```ts
amenity=bar        -> category: 'bar'
amenity=pub        -> category: 'bar'
amenity=restaurant -> category: 'restaurant'
amenity=cafe       -> category: 'cafe'
```

Then infer:

- `outdoorSetting: 'patio'` as the default for OSM-imported places unless curated otherwise

### Query expansion for first category release

Expand Overpass query to include:

- `node["amenity"="cafe"]["outdoor_seating"="yes"]`

Do not add store-like categories in the first pass.

### Future data quality work

Later phases could use:

- `amenity`
- `tourism`
- `shop`
- `cuisine`
- `brewery=*`
- curated override tables

But this should not block the first category filter release.

## UX Proposal

### Current problem

The current sidebar classification is misleading because users may interpret `patio` as a business type.

### Proposed filter stack

Recommended sidebar filter order:

1. Neighborhood
2. In current map view
3. Category
4. Outdoor setting

Why this order:

- Geography is usually the first constraint.
- Category is the most important "what am I looking for?" filter.
- Outdoor setting is the secondary preference.

### Proposed labels

- `Neighborhood`
- `Only show places in current map view`
- `Category`
- `Outdoor setting`

### Category options

- `All`
- `Bar`
- `Restaurant`
- `Cafe`
- `Brewery`

### Outdoor setting options

- `All`
- `Rooftop`
- `Garden`
- `Patio`

### Suggested recommendation copy

Current copy:

- `Best spots right now`

Possible improvements once category filters exist:

- `Best sunny spots right now`
- `Recommended spots`
- `Best matches right now`

Recommended choice:

- Keep `Best spots right now` or change to `Best sunny spots right now`

Reason:

- It keeps the product promise explicit.
- It emphasizes sun-first ranking even after more filters are added.

## Implementation Plan

## Phase 1: Rename the existing meaning of "type"

### Objective

Remove ambiguity before adding another classification axis.

### Tasks

- Rename `VenueType` to `OutdoorSetting` in `src/types/venue.ts`
- Rename `type` field to `outdoorSetting`
- Update all references in:
  - `src/data/curatedVenues.ts`
  - `src/lib/scoring.ts`
  - `src/lib/osm.ts`
  - `src/hooks/useMapboxPatioMap.ts`
  - UI components showing badges/popups/list metadata
- Rename UI label from generic `type` concepts to `Outdoor setting`

### Exit criteria

- No remaining product copy suggests `patio` is a business type
- Code compiles with `outdoorSetting` used consistently

## Phase 2: Add business category to curated data

### Objective

Support a high-value new filter with clean curated data first.

### Tasks

- Add `VenueCategory` type to `src/types/venue.ts`
- Add `category` field to every curated venue in `src/data/curatedVenues.ts`
- Decide and document category for each curated venue
- Update list badges and popup metadata to show category where useful

### Exit criteria

- Every curated venue has a non-empty category
- UI can render category labels cleanly

## Phase 3: Expand OSM ingestion

### Objective

Make live venues compatible with category filtering.

### Tasks

- Expand `fetchOSMVenues()` query in `src/lib/osm.ts` to include cafes
- Add a normalizer:

```ts
function normalizeOSMCategory(tags: Record<string, string>): VenueCategory
```

- Default OSM `outdoorSetting` to `patio`
- Preserve current duplicate-merge behavior
- Add a fallback category strategy for unknown imported venues

### Recommendation

Do not import stores in this phase.

### Exit criteria

- Imported OSM venues participate in category filtering
- No category-less imported venues appear in the app

## Phase 4: Add filtering model in app state

### Objective

Support multiple filter axes cleanly.

### Tasks

- Add new state in `src/hooks/usePatioAppState.ts`:
  - `selectedCategory`
  - `selectedOutdoorSetting`
- Add pure helpers in `src/lib/scoring.ts` or a new `src/lib/filtering.ts`:

```ts
filterVenuesByCategory(...)
filterVenuesByOutdoorSetting(...)
applyVenueFilters(...)
```

- Preserve current ordering:
  - neighborhood
  - viewport filter
  - category
  - outdoor setting

Recommended derived flow:

1. start with `allVenues`
2. apply neighborhood
3. apply category
4. apply outdoor setting
5. apply viewport filter
6. score and rank

### Exit criteria

- Filters compose predictably
- List and map stay synchronized

## Phase 5: Add UI controls

### Objective

Expose the new taxonomy in a clear way.

### Tasks

- Add `CategoryFilter` component
- Add `OutdoorSettingFilter` component
- Integrate them into `Sidebar.tsx`
- Update list item badges to show:
  - category
  - outdoor setting
- Update popup metadata line to show both

### UX guidance

Avoid showing too many badges if the card becomes visually noisy.

Recommended priority on cards:

1. neighborhood
2. category
3. outdoor setting
4. shadow badges

### Exit criteria

- Filters are understandable without explanation
- Cards remain readable

## Phase 6: Map representation

### Objective

Keep the map aligned with the filtered result set.

### Tasks

- Continue using the currently displayed venue list as the map source input
- Confirm popup-close behavior still works when category or outdoor setting filters exclude a venue
- Confirm `Fit map to listed places` uses the filtered list after the new filters are applied

### Exit criteria

- Map markers, popups, and sidebar list always reflect the same filtered set

## Phase 7: Validation and QA

### Objective

Verify the taxonomy change does not create confusing or inconsistent behavior.

### Test scenarios

1. No filters applied:
   - all curated + live venues appear
   - ranking still works

2. Category filter only:
   - `bar` shows bars only
   - `restaurant` shows restaurants only
   - `cafe` shows cafes only

3. Outdoor setting filter only:
   - `rooftop` shows rooftops only
   - `garden` shows gardens only
   - `patio` shows patios only

4. Combined filters:
   - `bar` + `rooftop`
   - `restaurant` + `patio`
   - `brewery` + `patio`

5. Combined with neighborhood:
   - `Williamsburg` + `bar`

6. Combined with viewport:
   - pan map
   - enable viewport filter
   - confirm list + markers match

7. Popup behavior:
   - open popup
   - change time
   - popup updates
   - apply category filter that excludes venue
   - popup closes

### Static validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Risks

### Risk 1: Ambiguous category assignment

Some venues can plausibly belong to more than one category.

Mitigation:

- choose a primary category for v1
- document overrides in curated data

### Risk 2: OSM data inconsistency

OSM tags are incomplete and inconsistent.

Mitigation:

- keep first-pass categories narrow
- default unknown live venues conservatively
- prefer curated correctness over aggressive expansion

### Risk 3: UI clutter

Adding both category and outdoor setting everywhere may overload cards.

Mitigation:

- prefer compact badges
- keep one metadata row
- avoid showing redundant labels repeatedly

### Risk 4: Filter complexity

Too many filters can make results disappear unexpectedly.

Mitigation:

- always show counts or empty-state explanations
- keep `All` as the default on new filters

## What Not To Do In The First Version

- Do not add `store` yet
- Do not add multi-category tagging
- Do not redesign the ranking algorithm around category
- Do not broaden to generic outdoor places beyond hospitality
- Do not pull in a large POI taxonomy before validating the basic filter model

## Recommended Implementation Order

1. Rename `type` -> `outdoorSetting`
2. Add `category` to curated venues
3. Add category support to OSM ingestion
4. Add category + outdoor setting filters to app state
5. Add sidebar controls
6. Update badges/popups/copy
7. Run validation and QA pass

## Final Recommendation

The most useful jobs to solve next are:

1. "I want a sunny place for the kind of outing I have in mind."
2. "I want that place to fit the kind of outdoor experience I want."
3. "I want to see options that are actually relevant to the area I am viewing."

That means the right next product move is:

- keep sun score as the ranking core
- add `Category` as the main new filter
- rename current `type` to `Outdoor setting`
- keep neighborhood and map-view filters as first-class context tools

This gives the product a cleaner and more understandable decision model without losing its sun-first identity.
