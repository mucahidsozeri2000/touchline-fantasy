import type { Vec2 } from './types';

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (p: Vec2, q: Vec2): Vec2 => ({ x: p.x + q.x, y: p.y + q.y });
export const sub = (p: Vec2, q: Vec2): Vec2 => ({ x: p.x - q.x, y: p.y - q.y });
export const scale = (p: Vec2, s: number): Vec2 => ({ x: p.x * s, y: p.y * s });
export const dot = (p: Vec2, q: Vec2): number => p.x * q.x + p.y * q.y;
export const cross = (p: Vec2, q: Vec2): number => p.x * q.y - p.y * q.x;
export const len = (p: Vec2): number => Math.hypot(p.x, p.y);
export const dist = (p: Vec2, q: Vec2): number => Math.hypot(p.x - q.x, p.y - q.y);
export const lerp = (p: Vec2, q: Vec2, t: number): Vec2 => ({
  x: p.x + (q.x - p.x) * t,
  y: p.y + (q.y - p.y) * t,
});

/** p noktasının [a,b] doğru parçasına uzaklığı. */
export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}
