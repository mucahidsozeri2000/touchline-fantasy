/**
 * Programatik test/örnek DXF'leri. Hem birim testleri, hem
 * `npm run fixtures` (tests/fixtures/*.dxf) hem de arayüzdeki
 * "Örnek DXF ile dene" butonu bunları kullanır. Tamamen yerel üretilir;
 * hiçbir şey indirilmez.
 */
import { DxfBuilder, type P } from '../core/export/dxfBuilder';

const MM = 4; // $INSUNITS = milimetre

const mm = () => new DxfBuilder().headerVar('$INSUNITS', 70, MM);

/** Dikdörtgeni 4 ayrı LINE olarak ekler. */
function rectLines(b: DxfBuilder, x: number, y: number, w: number, h: number, layer = '0') {
  b.line({ x, y }, { x: x + w, y }, layer)
    .line({ x: x + w, y }, { x: x + w, y: y + h }, layer)
    .line({ x: x + w, y: y + h }, { x, y: y + h }, layer)
    .line({ x, y: y + h }, { x, y }, layer);
}

/** 200×100 dikdörtgen (LINE'lar). */
export function rectangleDxf(): string {
  const b = mm();
  rectLines(b, 0, 0, 200, 100);
  return b.toString();
}

/** L profil 150×100, et kalınlığı 30 (kapalı LWPOLYLINE). */
export function lProfileDxf(): string {
  return mm()
    .lwpolyline(
      [
        { x: 0, y: 0 },
        { x: 150, y: 0 },
        { x: 150, y: 30 },
        { x: 30, y: 30 },
        { x: 30, y: 100 },
        { x: 0, y: 100 },
      ],
      true,
    )
    .toString();
}

/** Ø200 flanş, Ø80 merkez deliği, Ø12 × 6 cıvata deliği (PCD 150). */
export function flangeDxf(): string {
  const b = mm().circle({ x: 100, y: 100 }, 100).circle({ x: 100, y: 100 }, 40);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    b.circle({ x: 100 + 75 * Math.cos(a), y: 100 + 75 * Math.sin(a) }, 6);
  }
  return b.toString();
}

/**
 * Yay kenarlı parça: 160×80, köşeleri R10 yuvarlatılmış (bulge'lı LWPOLYLINE),
 * içinde ARC + LINE'lardan oluşan 60×16'lık bir oluk (slot).
 */
export function arcEdgeDxf(): string {
  const r = 10;
  const w = 160;
  const h = 80;
  const q = Math.tan(Math.PI / 8); // 90°'lik yay için bulge = tan(90°/4)
  const b = mm().lwpolyline(
    [
      { x: r, y: 0 },
      { x: w - r, y: 0, bulge: q },
      { x: w, y: r },
      { x: w, y: h - r, bulge: q },
      { x: w - r, y: h },
      { x: r, y: h, bulge: q },
      { x: 0, y: h - r },
      { x: 0, y: r, bulge: q },
    ],
    true,
  );
  // Oluk: merkezler (60,40) ve (100,40), yarıçap 8.
  b.line({ x: 60, y: 32 }, { x: 100, y: 32 })
    .arc({ x: 100, y: 40 }, 8, -90, 90)
    .line({ x: 100, y: 48 }, { x: 60, y: 48 })
    .arc({ x: 60, y: 40 }, 8, 90, 270);
  return b.toString();
}

/**
 * 400×300 plaka, içinde 300×200 büyük delik; deliğin içinde ayrı bir
 * 120×80 parça (Ø20 delikli). Hiyerarşi: plaka(0) → delik(1) → parça(2) → delik(3).
 */
export function plateWithInnerPartDxf(): string {
  const b = mm();
  rectLines(b, 0, 0, 400, 300);
  rectLines(b, 50, 50, 300, 200);
  rectLines(b, 140, 110, 120, 80);
  b.circle({ x: 200, y: 150 }, 10);
  return b.toString();
}

/**
 * Zincirleme zorlukları: sırası karışık, bazıları ters yönlü, uçları
 * 0.004 mm'ye kadar kopuk bir altıgen + kopya çizgi.
 */
export function messyChainDxf(): string {
  const pts: P[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    pts.push({ x: 50 + 50 * Math.cos(a), y: 50 + 50 * Math.sin(a) });
  }
  const jitter = (p: P, k: number): P => ({ x: p.x + 0.004 * Math.cos(k), y: p.y + 0.004 * Math.sin(k) });
  const edges: [P, P][] = pts.map((p, i) => [p, pts[(i + 1) % 6]]);
  const order = [3, 0, 5, 1, 4, 2];
  const b = mm();
  order.forEach((ei, k) => {
    const [a, c] = edges[ei];
    // Tek sıradakileri ters yaz, uçlara farklı küçük sapmalar ver.
    if (k % 2) b.line(jitter(c, k), jitter(a, k + 1));
    else b.line(jitter(a, k + 2), jitter(c, k + 3));
  });
  b.line(pts[0], pts[1]); // birebir kopya kenar
  return b.toString();
}

/** Bir kenarı eksik dikdörtgen (açık kontur) + sağlam bir kare. */
export function openContourDxf(): string {
  const b = mm()
    .line({ x: 0, y: 0 }, { x: 100, y: 0 })
    .line({ x: 100, y: 0 }, { x: 100, y: 50 })
    .line({ x: 100, y: 50 }, { x: 0, y: 50 });
  rectLines(b, 200, 0, 40, 40);
  return b.toString();
}

/**
 * Blok referansları: 50×30 dikdörtgen + Ø10 delik bloğu; biri 90° dönmüş,
 * biri x'te aynalı (sx = −1), biri 2×2 dizi (MINSERT).
 */
export function blocksDxf(): string {
  return mm()
    .block('PLAKA', { x: 0, y: 0 }, (b) => {
      rectLines(b, 0, 0, 50, 30);
      b.circle({ x: 15, y: 15 }, 5);
    })
    .insert('PLAKA', { x: 0, y: 0 })
    .insert('PLAKA', { x: 200, y: 0 }, { rotDeg: 90 })
    .insert('PLAKA', { x: 300, y: 0 }, { sx: -1 })
    .insert('PLAKA', { x: 0, y: 200 }, { cols: 2, rows: 2, colSpacing: 100, rowSpacing: 100 })
    .toString();
}

/** Birimsiz dosya, inç cinsinden 2"×1" dikdörtgen (INSUNITS=1). */
export function inchRectDxf(): string {
  const b = new DxfBuilder().headerVar('$INSUNITS', 70, 1);
  rectLines(b, 0, 0, 2, 1);
  return b.toString();
}

/** $INSUNITS içermeyen dosya. */
export function noUnitsDxf(): string {
  const b = new DxfBuilder();
  rectLines(b, 0, 0, 10, 10);
  return b.toString();
}

/** Elips + spline: elips parça ve iki kübik B-spline'dan oluşan damla. */
export function curvesDxf(): string {
  return mm()
    .ellipse({ x: 60, y: 40 }, { x: 60, y: 0 }, 0.5)
    .spline(
      3,
      [0, 0, 0, 0, 1, 1, 1, 1],
      [
        { x: 200, y: 0 },
        { x: 260, y: 0 },
        { x: 260, y: 80 },
        { x: 200, y: 80 },
      ],
    )
    .spline(
      3,
      [0, 0, 0, 0, 1, 1, 1, 1],
      [
        { x: 200, y: 80 },
        { x: 170, y: 80 },
        { x: 170, y: 0 },
        { x: 200, y: 0 },
      ],
    )
    .toString();
}

/** Tüm fixture'lar (dosya adı → üretici). */
export const FIXTURES: Record<string, () => string> = {
  'dikdortgen.dxf': rectangleDxf,
  'l-profil.dxf': lProfileDxf,
  'delikli-flans.dxf': flangeDxf,
  'yay-kenarli.dxf': arcEdgeDxf,
  'delik-icinde-parca.dxf': plateWithInnerPartDxf,
  'karisik-zincir.dxf': messyChainDxf,
  'acik-kontur.dxf': openContourDxf,
  'bloklar.dxf': blocksDxf,
  'inc-birim.dxf': inchRectDxf,
  'birimsiz.dxf': noUnitsDxf,
  'egriler.dxf': curvesDxf,
};

/** Arayüzdeki "Örnek DXF ile dene" için birkaç tipik parça (tek dosya). */
export function sampleDxf(): string {
  const b = mm();
  // Flanş
  b.circle({ x: 100, y: 100 }, 100).circle({ x: 100, y: 100 }, 40);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    b.circle({ x: 100 + 75 * Math.cos(a), y: 100 + 75 * Math.sin(a) }, 6);
  }
  // L profil
  b.lwpolyline(
    [
      { x: 260, y: 0 },
      { x: 410, y: 0 },
      { x: 410, y: 30 },
      { x: 290, y: 30 },
      { x: 290, y: 100 },
      { x: 260, y: 100 },
    ],
    true,
  );
  // Yuvarlak köşeli, oluklu plaka
  const q = Math.tan(Math.PI / 8);
  b.lwpolyline(
    [
      { x: 460, y: 0 },
      { x: 600, y: 0, bulge: q },
      { x: 610, y: 10 },
      { x: 610, y: 70, bulge: q },
      { x: 600, y: 80 },
      { x: 460, y: 80, bulge: q },
      { x: 450, y: 70 },
      { x: 450, y: 10, bulge: q },
    ],
    true,
  );
  b.line({ x: 500, y: 32 }, { x: 560, y: 32 })
    .arc({ x: 560, y: 40 }, 8, -90, 90)
    .line({ x: 560, y: 48 }, { x: 500, y: 48 })
    .arc({ x: 500, y: 40 }, 8, 90, 270);
  // Büyük delikli çerçeve + içinde küçük parça
  rectLines(b, 0, 250, 400, 250);
  rectLines(b, 40, 290, 320, 170);
  rectLines(b, 150, 335, 100, 80);
  b.circle({ x: 200, y: 375 }, 15);
  // Üçgen braket
  b.lwpolyline(
    [
      { x: 450, y: 250 },
      { x: 610, y: 250 },
      { x: 450, y: 410 },
    ],
    true,
  ).circle({ x: 490, y: 290 }, 10);
  return b.toString();
}
