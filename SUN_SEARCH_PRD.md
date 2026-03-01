# Sun Search PRD

## Goal

Evolve the app from a "best sunny spots right now" explorer into a flexible search tool that helps users find the best venue for a chosen area, venue type, and time window.

The key product shift is:

- from single-point-in-time ranking
- to intent-based sunlight search across a user-selected time range

This should support requests like:

- "Find me a cafe in this area with the most sunlight for the next hour."
- "Show me a bar nearby that stays sunny for 2 hours."
- "Find a restaurant here that gets the most sun until sunset."
- "What is the best sunny place in this area for the next 7 hours?"

The product should not special-case "next 4 hours." It should support a general search model.

## Problem

The current app already has several strong primitives:

- map-based area exploration
- category filtering
- outdoor setting filtering
- current-time sun and shadow scoring
- ranked results

But the current experience is still oriented around "right now."

Users who want to answer a planning question over time currently need to:

- move the map manually
- turn on the viewport filter
- set a category like cafe or bar
- scrub the time slider manually
- compare venues themselves over multiple timestamps

This is exploratory, but not task-completion oriented.

The missing product capability is a first-class concept of:

- area
- venue type
- time window
- sunlight objective

## Product Vision

The app should let a user express:

- where they want to go
- what kind of place they want
- when they care about sunlight
- how they want "best sunlight" interpreted

The ideal experience is that the user can select a small number of controls and immediately receive:

- a top recommendation
- a ranked list
- a clear explanation for why each result ranks well
- enough visual evidence to trust the ranking

## Jobs To Be Done

### Primary jobs

1. Find the sunniest place in the area I am already looking at.
2. Find a sunny place for a specific duration starting now.
3. Find a sunny place for a custom future time range.
4. Find a sunny place that matches my plan, such as coffee, drinks, or dinner.
5. Understand which venue will stay sunny longest, not just which is sunny this minute.

### Common user intents

- "I want coffee in the sun."
- "I want drinks somewhere sunny for the next 2 hours."
- "I want a restaurant in this neighborhood that stays sunny through lunch."
- "I only care about places visible in this map area."
- "I want something sunny now."
- "I want the longest uninterrupted sun."

## Target Users

- People deciding where to sit outdoors right now
- People planning a meal, coffee, or drinks within a known area
- Users browsing visually on the map rather than searching by exact venue name

## Non-Goals

For the initial version, do not expand scope into:

- reservations or booking
- occupancy / wait time prediction
- weather forecasting beyond the app's current sun model
- indoor seating recommendations
- personalized user profiles
- commute-time optimization
- natural-language chat as the primary interface

## Current State Summary

The app currently supports:

- venue category filtering
- neighborhood filtering
- viewport-based filtering
- outdoor setting filtering
- time scrubbing on a single slider
- ranking by current score

The app does not currently support:

- duration-based ranking
- custom time-window ranking
- ranking modes such as total sun vs continuous sun
- explicit "search this area" language
- per-result future sunlight summaries
- a compact future timeline for results

## Product Principles

1. The model should be flexible, not tied to one duration.
2. The default flow should stay fast for "right now" users.
3. Area should feel explicit and user-controlled.
4. Results should explain themselves.
5. Ranking should reflect the selected intent, not one fixed definition of "best."
6. The app should remain visually map-first and lightweight.

## Core Search Model

The search experience should be built around 4 inputs:

1. Area
2. Place type
3. Time window
4. Sun preference

### 1. Area

Area answers: "Where should results come from?"

Recommended options:

- `This map area`
- `Neighborhood`

Later options:

- `Near me`
- `Draw area`
- `Near destination`

Recommendation:

- Keep current viewport filtering behavior
- Rename it in the UI to feel like a search scope, not a technical toggle

Preferred copy:

- `Search this map area`

### 2. Place Type

Place type answers: "What kind of place do I want?"

Use the current category model:

- cafe
- bar
- restaurant
- brewery

Keep outdoor setting separate:

- rooftop
- garden
- patio

This preserves a clean distinction between:

- venue intent
- outdoor experience

### 3. Time Window

Time window answers: "Over what period should sunlight be evaluated?"

Recommended options for V1:

- `Right now`
- `Next 1 hour`
- `Next 2 hours`
- `Next 4 hours`
- `Next 6 hours`
- `Until sunset`
- `Custom range`

Design principle:

- `Right now` remains the default
- all other options should rerank results based on the whole selected window

### 4. Sun Preference

Sun preference answers: "What kind of sunlight outcome do I care about?"

Recommended V1 ranking modes:

- `Most total sun`
- `Longest continuous sun`
- `Sunny right away`

Potential later ranking modes:

- `Avoid shade`
- `Best late sun`
- `Best golden hour`

## UX Proposal

## Entry Point

Add a compact "Sun Search" control cluster near the top of the sidebar, above the result list.

Suggested structure:

- Area scope
- Place type
- Time window
- Sort / optimize for

This should sit above the current result ranking and update the entire list.

## Recommended Information Architecture

### Search controls

1. `Area`
   - Search this map area
   - Neighborhood selector

2. `Place type`
   - All
   - Cafe
   - Bar
   - Restaurant
   - Brewery

3. `Outdoor setting`
   - All
   - Patio
   - Rooftop
   - Garden

4. `When`
   - Right now
   - Duration presets
   - Until sunset
   - Custom range

5. `Optimize for`
   - Most total sun
   - Longest continuous sun
   - Sunny right away

### Results area

Show:

- top recommendation module
- ranked list
- explanation line per result
- mini future timeline for top results

## Example User Flows

### Flow A: Quick planning

User wants a cafe in the current map area with the best sunlight for the next 2 hours.

1. Pan map to desired area.
2. Select `Search this map area`.
3. Select `Cafe`.
4. Select `Next 2 hours`.
5. Keep `Most total sun`.
6. Review top-ranked cafes and their sunlight summaries.

### Flow B: Immediate decision

User wants the best sunny bar right now.

1. Select `Bar`.
2. Leave time window on `Right now`.
3. Review the top recommendation.

### Flow C: Longer stay

User wants a restaurant that stays sunny as long as possible from now until sunset.

1. Select area.
2. Select `Restaurant`.
3. Select `Until sunset`.
4. Select `Longest continuous sun`.
5. Review venues that preserve sunlight longest.

## Result Model

Each result should communicate both rank and reasoning.

### Required per-result fields for time-window searches

- venue name
- neighborhood / area
- category
- outdoor setting
- overall rank score
- explanation of why it ranked well

### Recommended explanation patterns

- `3h 20m of direct sun in the next 4h`
- `Sunny until 4:45 PM`
- `Best uninterrupted sun in this area`
- `Strong late-afternoon sun`
- `Sunny now, shaded after 2:30 PM`

### Recommended timeline preview

For top results, show a compact horizontal strip representing the selected time window, with:

- sunny segments
- shaded segments
- current time marker when relevant

This gives users confidence without forcing slider scrubbing.

## Ranking Model

The ranking system should move from single-timestamp scoring to window-aware scoring.

## V1 Ranking Inputs

For a selected time window, calculate at sampled intervals:

- sunlight score at each step
- whether the venue is shaded
- continuity of sunny periods

Recommended sample granularity:

- 15-minute intervals

This matches the current quarter-hour model and keeps behavior consistent.

## V1 Ranking Modes

### Most total sun

Definition:

- Sum sampled sunlight score across the selected time window

Best for:

- users who want maximum total sunlight exposure over the full duration

### Longest continuous sun

Definition:

- Rank based on the longest uninterrupted run above the "sunny" threshold

Best for:

- users who want to sit without losing sun midway through the visit

### Sunny right away

Definition:

- Weight near-term sunlight more heavily than later sunlight

Best for:

- users choosing where to go immediately

## Suggested Derived Metrics

For each result, compute:

- total sunny minutes
- longest continuous sunny span
- next shade time
- first sunny time if currently shaded
- average score over selected window

These metrics should drive both ranking and explanation copy.

## UX Copy Changes

The app should stop using "right now" language as the universal framing when a time window is selected.

Examples:

- Current: `Best Sunny Spots Right Now`
- Proposed:
  - `Best Sunny Spots Right Now`
  - `Best Sunny Cafes For The Next 2 Hours`
  - `Best Sunny Restaurants Until Sunset`

Area control copy:

- Current: `In map view`
- Proposed: `Search this map area`

This is more user-centered and matches how people describe the task.

## Presets

Presets should accelerate common tasks without constraining the product model.

Recommended optional presets:

- `Coffee in the sun`
- `Sunny for 1 hour`
- `Sunny for 2 hours`
- `Lunch in the sun`
- `Drinks until sunset`
- `Golden hour`

These should be shortcuts that populate existing controls, not separate ranking systems.

## Edge Cases

### No matching venues

If filters produce no results:

- explain why
- suggest broadening area or place type

### Low-sun or night conditions

If the selected time window has minimal sunlight:

- clarify that few or no venues will receive direct sun
- still rank venues, but explain low confidence in useful differences

### Window extends beyond sunset

If the chosen duration extends into darkness:

- clearly indicate that part of the window has no sunlight
- optionally suggest `Until sunset`

### Limited confidence for imported venues

Some imported venues may have weaker directional confidence.

The product should be able to:

- use them in ranking
- optionally show lower confidence
- avoid overstating precision

## Success Metrics

### Primary metrics

- Increase in successful venue selections from the list
- Reduced time from first interaction to venue selection
- Increased usage of category and area filters together
- Increased repeated use of time-based search controls

### Secondary metrics

- Share actions from time-window searches
- Reduced excessive slider scrubbing
- Increased interaction with result explanations or timelines

## Rollout Plan

## Phase 1: Flexible time-window ranking

Ship:

- `Right now` plus duration presets
- `Until sunset`
- duration-aware reranking
- updated result headers and explanation copy

Do not yet ship:

- custom drawn areas
- advanced visual timelines

## Phase 2: Result explainability

Ship:

- per-result explanation lines
- timeline preview for top results
- ranking mode selector

## Phase 3: Area and confidence improvements

Ship:

- stronger area-search language and affordances
- confidence handling for imported venues
- future improvements to facing/orientation accuracy

## Open Questions

1. Should `Custom range` be part of V1, or should V1 ship only with preset durations plus `Until sunset`?
2. Should ranking mode be visible by default, or tucked under an advanced control?
3. How much confidence language is needed for imported OSM venues in the first release?
4. Should the top recommendation card become more detailed in time-window mode than in `Right now` mode?
5. Should presets be shown in V1, or only after the core model proves useful?

## Recommendation

The best first release is not "next 4 hours."

The best first release is:

1. explicit area search
2. flexible time-window selection
3. generalized sunlight ranking across that window
4. clear result explanations

That creates a durable product model that supports:

- 1 hour
- 2 hours
- 4 hours
- 7 hours
- until sunset
- cafes, bars, restaurants, and other supported categories

without redesigning the experience around one specific query shape.

## Detailed Implementation Plan

This section translates the product proposal into a concrete implementation path for the current codebase.

The guiding principle is:

- keep V1 tight
- preserve the current "right now" experience
- add the minimum new system needed to validate time-window search

## V1 MVP Scope

V1 should include only these new capabilities:

1. Time-window selection with preset durations
2. `Until sunset` as a special option
3. Window-aware ranking using existing venue data and quarter-hour sampling
4. Updated result copy that reflects the selected time window
5. Per-result sunlight summary text
6. Renamed viewport control: `Search this map area`

V1 should not include:

- custom date selection
- arbitrary custom start and end times
- ranking mode selector
- timeline visualizations
- presets like `Lunch in the sun`
- new map interactions
- confidence badges
- backend changes
- data model expansion beyond what is required for time-window ranking

## V1 Product Definition

### User controls in V1

The sidebar should support:

- area: existing viewport toggle with improved copy
- place type: existing category filter
- outdoor setting: existing outdoor setting filter
- when:
  - right now
  - next 1 hour
  - next 2 hours
  - next 4 hours
  - next 6 hours
  - until sunset

V1 should not expose an "optimize for" control.

V1 ranking should use one default ranking rule:

- `Most total sun` across the selected window

This keeps the MVP simple and avoids premature complexity.

## V1 User Experience Changes

### Sidebar changes

Add a new compact `When` control near the existing filters.

Recommended placement:

- after category
- before outdoor setting

Reason:

- category is primary intent
- time window is the new core decision axis
- outdoor setting remains a secondary refinement

### Result list changes

When `Right now` is selected:

- preserve current behavior and current language

When a duration window is selected:

- update the list header
- rerank all venues using the window score
- show an explanation line on each result

Examples:

- `2h 15m of sun in the next 4h`
- `Sunny until 3:45 PM`
- `45m of sun before shade`

### Top banner changes

The top recommendation module should adapt to the selected search mode.

For `Right now`:

- preserve current behavior

For duration modes:

- show the winning venue
- replace `in full sun` / `in the shade` copy with time-window summary copy

Examples:

- `Best sun for the next 2h`
- `1h 40m of sun before 4:15 PM`

## Technical Design

The current app already computes:

- filtered venues
- current hour
- current shadow-informed score

V1 should extend that system rather than replacing it.

## New State Model

Add a new time-window selection state to app state.

Suggested shape:

```ts
type SearchWindowPreset =
  | 'right_now'
  | 'next_1h'
  | 'next_2h'
  | 'next_4h'
  | 'next_6h'
  | 'until_sunset';
```

This should live in [src/hooks/usePatioAppState.ts](/Users/priyam/Projects/nyc-patio-finder/src/hooks/usePatioAppState.ts).

V1 should not add a separate custom start time.

The start time is always:

- current selected hour from the existing slider

This keeps the current time model intact:

- `Right now` means current selected hour
- duration modes mean from current selected hour forward

This is important because the current slider already acts as the search anchor.

## New Derived Window Model

Add utility logic to resolve the selected preset into a real window.

Suggested derived structure:

```ts
interface SearchWindow {
  preset: SearchWindowPreset;
  startHour: number;
  endHour: number;
  label: string;
  isRightNow: boolean;
}
```

Responsibilities:

- map preset to hour span
- cap end hour at sunset or end-of-day as needed
- provide UI copy

Recommended location:

- [src/lib/time.ts](/Users/priyam/Projects/nyc-patio-finder/src/lib/time.ts) or
- a new small utility file like `src/lib/searchWindow.ts`

Recommendation:

- create `src/lib/searchWindow.ts`

This keeps time-window logic isolated from general time formatting.

## Ranking Logic Changes

The current ranking path is centered on:

- `calcScore`
- `scoreVenues`
- `computeSunUntil`

These live in [src/lib/scoring.ts](/Users/priyam/Projects/nyc-patio-finder/src/lib/scoring.ts).

V1 should extend this file with window-aware helpers rather than rewriting current behavior.

### Keep existing functions

Do not remove:

- `calcScore`
- `scoreVenues`
- `computeSunUntil`

These are still useful for `Right now` mode and backward compatibility.

### Add new window-scoring helpers

Suggested additions:

```ts
interface WindowScoreSummary {
  totalScore: number;
  averageScore: number;
  sunnyMinutes: number;
  firstShadeHour: number | null;
  firstSunnyHour: number | null;
  sampleCount: number;
}
```

```ts
function buildWindowSamples(startHour: number, endHour: number): number[]
```

```ts
function summarizeVenueForWindow(
  venue: Venue,
  samples: number[],
  shadowScores: Record<string, ShadowScore>
): WindowScoreSummary
```

```ts
function scoreVenuesForWindow(
  venues: Venue[],
  samples: number[],
  shadowScores: Record<string, ShadowScore>
): VenueWithWindowScore[]
```

Recommended V1 ranking rule:

- sort descending by `sunnyMinutes`
- break ties by `totalScore`
- break remaining ties by current score at start hour

Reason:

- `sunnyMinutes` is understandable to users
- `totalScore` preserves nuance among similarly sunny venues
- current score tie-break keeps results intuitive

### Sunny threshold

Use the current threshold implied by `computeSunUntil`:

- sunny if score >= 40

Do not introduce a new threshold in V1.

### Sampling cadence

Use 15-minute samples:

- consistent with current slider step
- consistent with current time granularity
- low implementation risk

## Data Structure Changes

Add a window-aware venue type for derived UI output.

Suggested approach:

- keep `VenueWithScore` unchanged
- add a new derived type for window results

Example:

```ts
interface VenueWithWindowScore extends VenueWithScore {
  window: WindowScoreSummary;
  displayScore: number;
}
```

This derived type should be used only in UI and ranking code.

Recommendation:

- define it in [src/types/venue.ts](/Users/priyam/Projects/nyc-patio-finder/src/types/venue.ts)

## UI Component Changes

## 1. Add a `WhenFilter` component

Create a small dedicated component for the new time-window selector.

Suggested file:

- `src/components/WhenFilter.tsx`

Responsibilities:

- render preset options
- emit selected preset
- keep copy compact for mobile and desktop

V1 recommendation:

- use a `<select>` first
- do not build a segmented control initially

Reason:

- faster to ship
- lower styling risk
- consistent with existing filters

## 2. Update `Sidebar.tsx`

File:

- [src/components/Sidebar.tsx](/Users/priyam/Projects/nyc-patio-finder/src/components/Sidebar.tsx)

Changes:

- accept new props for selected window preset and change handler
- rename `In map view` copy to `Search this map area`
- insert `WhenFilter`
- update result header copy based on selected window and category

V1 header examples:

- `Best Sunny Spots Right Now`
- `Best Sunny Cafes For The Next 2 Hours`
- `Best Sunny Restaurants Until Sunset`

## 3. Update `NowBanner.tsx`

File:

- [src/components/NowBanner.tsx](/Users/priyam/Projects/nyc-patio-finder/src/components/NowBanner.tsx)

Changes:

- allow a time-window summary mode
- preserve current mode for `Right now`
- show window summary copy for duration searches

Do not redesign the component in V1.

## 4. Update `VenueListItem.tsx`

File:

- [src/components/VenueListItem.tsx](/Users/priyam/Projects/nyc-patio-finder/src/components/VenueListItem.tsx)

Changes:

- support a new explanation line derived from the window summary
- preserve current current-time badges
- avoid adding too many badges in V1

The most important addition is a single explanation sentence.

## 5. Keep `TimePanel.tsx`

File:

- [src/components/TimePanel.tsx](/Users/priyam/Projects/nyc-patio-finder/src/components/TimePanel.tsx)

V1 should keep the existing slider.

Reason:

- it already controls the search anchor time
- it gives users a direct way to explore future starts
- it avoids introducing another time input pattern

Only copy may need slight adjustment later if confusion appears.

## Hook Changes

## `usePatioAppState.ts`

File:

- [src/hooks/usePatioAppState.ts](/Users/priyam/Projects/nyc-patio-finder/src/hooks/usePatioAppState.ts)

Add:

- `selectedWindowPreset`
- setter for selected window preset
- derived `searchWindow`

Do not move the current filter logic out of the hook.

V1 should keep one central state hook and extend it modestly.

## `App.tsx`

File:

- [src/App.tsx](/Users/priyam/Projects/nyc-patio-finder/src/App.tsx)

Changes:

- decide whether to use current-time ranking or window ranking
- compute the top result from the selected ranking mode
- pass new props into `Sidebar`

Recommended logic:

- if preset is `right_now`, use existing `scoreVenues`
- otherwise, use `scoreVenuesForWindow`

This minimizes regression risk.

## Copy and Formatting Helpers

V1 will need small helper functions for UI copy.

Suggested additions:

- window label formatter
- category-aware list title formatter
- explanation-line formatter

Recommended location:

- `src/lib/time.ts` for low-level time formatting
- new helper file like `src/lib/searchCopy.ts` for product copy formatting

Recommendation:

- add `src/lib/searchCopy.ts`

This keeps product phrasing out of components.

## MVP Explanation Rules

To keep V1 tight, use deterministic copy rules.

### For right now

Keep existing copy.

### For duration windows

Preferred explanation order:

1. If sunny minutes is zero:
   - `No direct sun in this window`
2. If currently sunny and first shade exists:
   - `{X} of sun, until {time}`
3. If currently shaded but later turns sunny:
   - `Sun starts at {time} for {X}`
4. Otherwise:
   - `{X} of direct sun in this window`

This is sufficient for MVP and avoids an overdesigned explanation system.

## MVP Design Constraints

V1 should avoid:

- new card layouts
- chart-heavy UI
- map marker redesign
- multiple competing ranking controls

The new behavior should feel like a natural extension of the current product, not a new product surface.

## Testing Plan

V1 needs both logic tests and UI smoke coverage.

## Unit tests

Primary file:

- [src/lib/scoring.test.ts](/Users/priyam/Projects/nyc-patio-finder/src/lib/scoring.test.ts)

Add tests for:

- sample generation across 1h, 2h, 4h, 6h windows
- `until sunset` clamping
- sunny-minutes calculation
- ranking order stability
- zero-sun cases
- tie-breaking behavior

Also add tests for any new helper in:

- `src/lib/searchWindow.ts`
- `src/lib/searchCopy.ts`

## Manual verification checklist

1. `Right now` mode behaves exactly as before.
2. Changing the window preset reranks venues.
3. Category filtering still applies before ranking.
4. `Search this map area` still filters correctly.
5. The slider changes the start time for duration searches.
6. `Until sunset` behaves sensibly near sunset and after sunset.
7. Empty-result states still render correctly.
8. Mobile sidebar remains usable with the new control added.

## Delivery Phases

## Phase 1: Core window model

Implement:

- new preset state
- search-window utility
- scoring helpers
- unit tests

No UI changes yet except temporary wiring if needed.

Success condition:

- duration-based ranking works correctly in code

## Phase 2: MVP UI wiring

Implement:

- `WhenFilter`
- sidebar copy updates
- top banner updates
- venue explanation text

Success condition:

- users can complete a duration-based search without slider scrubbing through the whole window

## Phase 3: QA and polish

Implement:

- copy refinements
- mobile fit checks
- empty-state improvements
- regression testing

Success condition:

- V1 feels consistent with the current app and does not degrade the existing quick "right now" flow

## V1 Acceptance Criteria

V1 is complete when:

1. A user can choose `Cafe`, `Bar`, `Restaurant`, or `Brewery`.
2. A user can limit results to the current map area.
3. A user can choose `Right now`, `Next 1 hour`, `Next 2 hours`, `Next 4 hours`, `Next 6 hours`, or `Until sunset`.
4. Results rerank based on the selected full time window, not just the current timestamp.
5. Each result in time-window mode shows a short textual sunlight summary.
6. The top recommendation reflects the selected time window.
7. Existing `Right now` behavior still works.
8. Existing filters and map behavior still work.

## Post-MVP Roadmap

After V1 proves useful, the next most valuable additions are:

1. ranking mode selector
2. mini sunlight timelines on results
3. quick presets like `Lunch in the sun`
4. custom time ranges
5. venue confidence handling

These should come after validating that users understand and use the core time-window search model.
