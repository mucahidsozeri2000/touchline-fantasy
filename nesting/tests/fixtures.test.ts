import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../src/samples/shapes';
import { importDxf } from '../src/core/dxf';

describe('tests/fixtures dosyaları güncel ve okunabilir', () => {
  for (const [name, make] of Object.entries(FIXTURES)) {
    it(name, () => {
      const text = readFileSync(join(__dirname, 'fixtures', name), 'utf8');
      expect(text, 'npm run fixtures ile yeniden üretin').toBe(make());
      expect(() => importDxf(text, name)).not.toThrow();
    });
  }
});
