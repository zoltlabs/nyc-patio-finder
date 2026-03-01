import { CITIES } from '../data/cities';

interface CitySelectorProps {
  currentSlug: string;
  onChange: (slug: string) => void;
}

const cityEntries = Object.values(CITIES);

export function CitySelector({ currentSlug, onChange }: CitySelectorProps) {
  return (
    <select
      id="city-selector"
      value={currentSlug}
      onChange={(e) => onChange(e.target.value)}
    >
      {cityEntries.map((city) => (
        <option key={city.slug} value={city.slug}>
          {city.shortName} — {city.name}
        </option>
      ))}
    </select>
  );
}
