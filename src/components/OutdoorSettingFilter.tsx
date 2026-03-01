import type { OutdoorSetting } from '../types/venue';

interface OutdoorSettingFilterProps {
  outdoorSettings: OutdoorSetting[];
  selectedOutdoorSetting: OutdoorSetting | 'all';
  onChange: (value: OutdoorSetting | 'all') => void;
}

function formatOutdoorSettingLabel(outdoorSetting: OutdoorSetting): string {
  switch (outdoorSetting) {
    case 'rooftop':
      return 'Rooftop';
    case 'garden':
      return 'Garden';
    case 'patio':
      return 'Patio';
  }
}

export function OutdoorSettingFilter({
  outdoorSettings,
  selectedOutdoorSetting,
  onChange,
}: OutdoorSettingFilterProps) {
  return (
    <div className="filter-group">
      <label htmlFor="outdoor-setting-filter">Outdoor setting</label>
      <select
        id="outdoor-setting-filter"
        value={selectedOutdoorSetting}
        onChange={(event) => onChange(event.target.value as OutdoorSetting | 'all')}
      >
        <option value="all">All outdoor settings</option>
        {outdoorSettings.map((outdoorSetting) => (
          <option key={outdoorSetting} value={outdoorSetting}>
            {formatOutdoorSettingLabel(outdoorSetting)}
          </option>
        ))}
      </select>
    </div>
  );
}
