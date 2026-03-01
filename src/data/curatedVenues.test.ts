import { describe, expect, it } from 'vitest';
import { CURATED_VENUES } from './curatedVenues';

describe('CURATED_VENUES taxonomy', () => {
  it('assigns category and outdoorSetting to every curated venue', () => {
    for (const venue of CURATED_VENUES) {
      expect(venue.category).toBeTruthy();
      expect(venue.outdoorSetting).toBeTruthy();
    }
  });

  it('does not retain the legacy type field on venue objects', () => {
    for (const venue of CURATED_VENUES) {
      expect(Object.prototype.hasOwnProperty.call(venue, 'type')).toBe(false);
    }
  });
});
