/**
 * Test DXF'lerini üretir: `npm run fixtures` → tests/fixtures/*.dxf
 * Üreticiler src/samples/shapes.ts içinde; birim testleri de aynılarını
 * bellekte kullanır. Dosyalar arayüzde elle denemek içindir.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURES } from '../../src/samples/shapes';

const dir = import.meta.dirname;
for (const [name, make] of Object.entries(FIXTURES)) {
  writeFileSync(join(dir, name), make());
  console.log('yazıldı:', join('tests/fixtures', name));
}
