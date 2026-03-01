import { describe, expect, it } from 'vitest';
import { normalizeOSMCategory } from './osm';

describe('normalizeOSMCategory', () => {
  it('maps supported amenities into venue categories', () => {
    expect(normalizeOSMCategory({ amenity: 'bar' })).toBe('bar');
    expect(normalizeOSMCategory({ amenity: 'pub' })).toBe('bar');
    expect(normalizeOSMCategory({ amenity: 'restaurant' })).toBe('restaurant');
    expect(normalizeOSMCategory({ amenity: 'cafe' })).toBe('cafe');
  });

  it('falls back to restaurant for unknown amenities', () => {
    expect(normalizeOSMCategory({ amenity: 'fast_food' })).toBe('restaurant');
    expect(normalizeOSMCategory({})).toBe('restaurant');
  });
});
