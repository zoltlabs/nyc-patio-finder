export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpHex(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const [ar, ag, ab] = [ah >> 16, (ah >> 8) & 0xff, ah & 0xff];
  const [br, bg, bb] = [bh >> 16, (bh >> 8) & 0xff, bh & 0xff];
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

export function scoreColor(score: number): string {
  if (score < 30) return lerpHex('#334477', '#4488ff', score / 30);
  if (score < 55) return lerpHex('#4488ff', '#ffaa22', (score - 30) / 25);
  if (score < 78) return lerpHex('#ffaa22', '#ff6600', (score - 55) / 23);
  return lerpHex('#ff6600', '#ffdd22', (score - 78) / 22);
}
