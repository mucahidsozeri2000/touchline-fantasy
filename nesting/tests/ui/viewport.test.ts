import { describe, expect, it } from 'vitest';
import { fit, toScreen, toWorld, zoomAt } from '../../src/ui/canvas/viewport';

describe('viewport', () => {
  it('fit: bbox merkezi ekran merkezine gelir, y ekseni ters', () => {
    const v = fit({ minX: 0, minY: 0, maxX: 3000, maxY: 1500 }, 800, 600, 0);
    expect(toScreen(v, { x: 1500, y: 750 })).toEqual({ x: 400, y: 300 });
    const top = toScreen(v, { x: 0, y: 1500 });
    const bottom = toScreen(v, { x: 0, y: 0 });
    expect(top.y).toBeLessThan(bottom.y);
  });

  it('zoomAt imleç altındaki noktayı sabit tutar; toWorld tersidir', () => {
    const v = fit({ minX: 0, minY: 0, maxX: 100, maxY: 100 }, 500, 500);
    const at = { x: 123, y: 321 };
    const w = toWorld(v, at);
    const z = zoomAt(v, at, 3.7);
    const back = toScreen(z, w);
    expect(back.x).toBeCloseTo(at.x, 9);
    expect(back.y).toBeCloseTo(at.y, 9);
  });
});
