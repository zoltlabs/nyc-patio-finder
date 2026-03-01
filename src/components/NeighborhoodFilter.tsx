interface NeighborhoodFilterProps {
  neighborhoods: string[];
  selectedNeighborhood: string;
  onChange: (value: string) => void;
}

export function NeighborhoodFilter({
  neighborhoods,
  selectedNeighborhood,
  onChange,
}: NeighborhoodFilterProps) {
  return (
    <div className="filter-group">
      <label htmlFor="hood-filter">Neighborhood</label>
      <select
        id="hood-filter"
        value={selectedNeighborhood}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="all">All neighborhoods</option>
        {neighborhoods.map((neighborhood) => (
          <option key={neighborhood} value={neighborhood}>
            {neighborhood}
          </option>
        ))}
      </select>
    </div>
  );
}
