import { memo } from 'react';
import type { ImportedPart } from '../core/dxf/types';
import type { Ring } from '../core/geometry/types';
import { partFill, partStroke } from './colors';

/** SVG yolu; y ekseni ters çevrilir (CAD y-yukarı → SVG y-aşağı). */
function d(ring: Ring, h: number): string {
  return ring.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${(h - p.y).toFixed(2)}`).join('') + 'Z';
}

export const PartThumb = memo(function PartThumb({
  part,
  colorIndex,
  size = 40,
}: {
  part: ImportedPart;
  colorIndex: number;
  size?: number;
}) {
  const w = Math.max(part.bbox.maxX, 1e-3);
  const h = Math.max(part.bbox.maxY, 1e-3);
  const pad = Math.max(w, h) * 0.06;
  const path = [part.outer, ...part.holes].map((c) => d(c.ring, h)).join('');
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`}
      className="shrink-0 rounded bg-white"
      aria-hidden
    >
      <path
        d={path}
        fillRule="evenodd"
        fill={partFill(colorIndex, 0.45)}
        stroke={partStroke(colorIndex)}
        strokeWidth={Math.max(w, h) / size}
      />
    </svg>
  );
});
