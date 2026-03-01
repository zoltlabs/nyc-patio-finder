import type { VenueCategory } from '../types/venue';

interface CategoryFilterProps {
  categories: VenueCategory[];
  selectedCategory: VenueCategory | 'all';
  onChange: (value: VenueCategory | 'all') => void;
}

function formatCategoryLabel(category: VenueCategory): string {
  switch (category) {
    case 'bar':
      return 'Bar';
    case 'restaurant':
      return 'Restaurant';
    case 'cafe':
      return 'Cafe';
    case 'brewery':
      return 'Brewery';
  }
}

export function CategoryFilter({ categories, selectedCategory, onChange }: CategoryFilterProps) {
  return (
    <div className="filter-group">
      <label htmlFor="category-filter">Category</label>
      <select
        id="category-filter"
        value={selectedCategory}
        onChange={(event) => onChange(event.target.value as VenueCategory | 'all')}
      >
        <option value="all">All categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {formatCategoryLabel(category)}
          </option>
        ))}
      </select>
    </div>
  );
}
