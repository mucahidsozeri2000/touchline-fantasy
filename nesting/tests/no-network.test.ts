/**
 * Ürünün temel vaadi: çizimler tarayıcıdan ÇIKMAZ. Bu test, kaynak kodda ağ
 * erişimi sağlayan API'lerin kullanılmadığını statik olarak doğrular.
 * (Çalışma zamanında da üretim derlemesindeki CSP `connect-src 'self'` ile
 * harici istekler engellenir — bkz. vite.config.ts.)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FORBIDDEN = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bsendBeacon\b/,
  /\bRTCPeerConnection\b/,
  /\bimportScripts\s*\(/,
  /https?:\/\/(?!www\.w3\.org\/)/, // svg xmlns dışında URL yok
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|html|css)$/.test(name) ? [p] : [];
  });
}

describe('ağ erişimi yasağı', () => {
  const root = join(__dirname, '..');
  const files = [...walk(join(root, 'src')), join(root, 'index.html')];

  it('kaynak dosyalar bulundu', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const f of files) {
    it(f.slice(root.length + 1), () => {
      const text = readFileSync(f, 'utf8');
      for (const re of FORBIDDEN) expect(text, `${re} bulundu`).not.toMatch(re);
    });
  }
});
