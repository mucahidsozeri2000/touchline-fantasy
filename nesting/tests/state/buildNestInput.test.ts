import { describe, expect, it } from 'vitest';
import { importDxf } from '../../src/core/dxf';
import { DEFAULT_SHEET, buildNestInput, type LoadedFile } from '../../src/state/store';
import { rectangleDxf, flangeDxf } from '../../src/samples/shapes';

const file = (id: string, text: string): LoadedFile => ({ id, name: id, status: 'ok', result: importDxf(text, `${id}.dxf`) });

describe('buildNestInput', () => {
  const files = [file('a', rectangleDxf()), file('b', flangeDxf())];
  const [ra, rb] = files.map((f) => f.result!.parts[0].id);

  it('varsayılanlar: adet 1, 4 yönlü dönüş, sınırsız sac', () => {
    const inp = buildNestInput({ files, partSettings: {}, sheet: DEFAULT_SHEET });
    expect(inp.parts).toHaveLength(2);
    expect(inp.parts[0]).toMatchObject({ quantity: 1, rotations: [0, 90, 180, 270], allowMirror: false, priority: 0 });
    expect(inp.sheet).toEqual({ sizeX: 3000, sizeY: 1500, count: null, margin: 10 });
    expect(inp.settings).toMatchObject({ gap: 5, kerf: 0.2, gravity: 'left', simplifyTolerance: 0.1, chordTolerance: 0.05 });
  });

  it('parça ayarları ve sınırlı sac adedi', () => {
    const inp = buildNestInput({
      files,
      partSettings: {
        [ra]: { quantity: 7.6, rotation: 'free', rotationStep: 90, mirror: true, priority: 2 },
        [rb]: { quantity: 0, rotation: 'none', rotationStep: 15, mirror: false, priority: 0 },
      },
      sheet: { ...DEFAULT_SHEET, unlimited: false, count: 3 },
    });
    expect(inp.parts[0]).toMatchObject({ quantity: 7, rotations: [0, 90, 180, 270], allowMirror: true, priority: 2 });
    expect(inp.parts[1]).toMatchObject({ quantity: 0, rotations: [0] });
    expect(inp.sheet.count).toBe(3);
  });
});
