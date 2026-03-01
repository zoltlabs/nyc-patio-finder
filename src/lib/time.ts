export function roundToQuarter(hour: number): number {
  return Math.min(23, Math.max(0, Math.round(hour * 4) / 4));
}

export function dateAt(hour: number, baseDate = new Date()): Date {
  const date = new Date(baseDate);
  date.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return date;
}

export function formatDisplayTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour % 1) * 60);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatDateLabel(shortName = 'NYC', now = new Date()): string {
  return `Today · ${now.toLocaleDateString(undefined, { weekday: 'short' })}, ${now.toLocaleDateString(undefined, { month: 'short' })} ${now.getDate()} · Real 3D ${shortName}`;
}
