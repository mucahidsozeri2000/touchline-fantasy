/**
 * Tüm arayüz metinleri. İleride `en.ts` aynı şekli (typeof tr) uygulayarak
 * eklenebilir.
 */
import type { ImportErrorCode, ImportWarning } from '../core/dxf/types';

const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

const UNIT_NAMES: Record<number, string> = {
  0: 'birimsiz',
  1: 'inç',
  2: 'feet',
  3: 'mil (kara)',
  4: 'mm',
  5: 'cm',
  6: 'm',
  7: 'km',
  8: 'mikroinç',
  9: 'mil (thou)',
  10: 'yard',
  13: 'mikron',
  14: 'dm',
};

export const tr = {
  appTitle: 'Sac Nesting',
  privacyBadge: 'Çizimleriniz bilgisayarınızdan çıkmaz',
  privacyTooltip:
    'Tüm hesaplama tarayıcınızda yapılır. DXF dosyaları hiçbir sunucuya gönderilmez; uygulama internet bağlantısı olmadan da çalışır.',

  drop: {
    title: 'DXF dosyalarını buraya sürükleyin',
    subtitle: 'veya bilgisayarınızdan seçin',
    choose: 'Dosya seç',
    sample: 'Örnek DXF ile dene',
    compact: 'DXF ekle (sürükle veya tıkla)',
    dragging: 'Bırakın…',
    notDxf: (name: string) => `"${name}" bir DXF dosyası değil, atlandı.`,
  },

  parts: {
    heading: 'Parçalar',
    empty: 'Henüz parça yok.',
    name: 'Parça',
    size: 'Ölçü (mm)',
    area: 'Alan',
    holes: (n: number) => (n === 0 ? 'deliksiz' : `${n} delik`),
    removeFile: 'Dosyayı kaldır',
    clearAll: 'Tümünü temizle',
    loading: 'Okunuyor…',
    partCount: (n: number) => `${n} parça`,
    openCount: (n: number) => `${n} açık kontur`,
  },

  metrics: {
    heading: 'Özet',
    fileCount: 'Dosya',
    partTypes: 'Parça tipi',
    totalArea: 'Toplam parça alanı',
    openContours: 'Açık kontur',
    warnings: 'Uyarı',
    nestingSoon: 'Nesting (yerleştirme) sonraki aşamada eklenecek.',
  },

  canvas: {
    hint: 'Tekerlek: yakınlaştır · Sürükle: kaydır · Çift tık: sığdır',
    fit: 'Sığdır',
    openContour: 'Açık kontur (kapanmıyor)',
  },

  units: {
    name: (code: number) => UNIT_NAMES[code] ?? `kod ${code}`,
    detected: (code: number) => `Birim: ${UNIT_NAMES[code] ?? code}`,
  },

  format: {
    mm: (v: number) => nf.format(v),
    size: (w: number, h: number) => `${nf.format(w)} × ${nf.format(h)}`,
    /** mm² → cm² ya da m² (büyükse). */
    area: (mm2: number) => (mm2 >= 1e6 ? `${nf2.format(mm2 / 1e6)} m²` : `${nf.format(mm2 / 100)} cm²`),
  },

  warning(w: ImportWarning): string {
    switch (w.code) {
      case 'UNITS_ASSUMED_MM':
        return 'Dosyada çizim birimi tanımlı değil; milimetre varsayıldı. Ölçüler yanlış görünüyorsa birimi elle seçin.';
      case 'UNITS_UNSUPPORTED':
        return `Dosya birimi (${UNIT_NAMES[w.insunits] ?? `kod ${w.insunits}`}) desteklenmiyor; milimetre varsayıldı.`;
      case 'OPEN_CONTOURS':
        return `${w.count} kontur kapanmıyor (kırmızıyla gösterildi). Bu çizgiler parça olarak kullanılmayacak. Çizimde uçların birleştiğinden emin olun.`;
      case 'AMBIGUOUS_JUNCTIONS':
        return `${w.count} noktada ikiden fazla çizgi birleşiyor. Konturlar tahminle ayrıldı; parçaları kontrol edin.`;
      case 'DUPLICATES_REMOVED':
        return `${w.count} üst üste binen kopya çizgi yok sayıldı.`;
      case 'IGNORED_ENTITIES': {
        const list = Object.entries(w.counts)
          .map(([t, n]) => `${n} ${t}`)
          .join(', ');
        return `Geometri olmayan öğeler yok sayıldı: ${list}.`;
      }
      case 'SPLINE_FIT_POINTS_ONLY':
        return `${w.count} spline yalnızca geçiş noktalarıyla tanımlı; noktalar arası düz çizgiyle yaklaşıldı.`;
      case 'INVALID_ENTITIES': {
        const list = Object.entries(w.counts)
          .map(([t, n]) => `${n} ${t}`)
          .join(', ');
        return `Hatalı tanımlı öğeler atlandı veya yaklaşıldı: ${list}.`;
      }
      case 'NON_PLANAR':
        return `${w.count} öğe XY düzleminde değil; düzleme izdüşürüldü.`;
      case 'BLOCK_NOT_FOUND':
        return `"${w.name}" adlı blok tanımı dosyada yok; referansı atlandı.`;
      case 'BLOCK_RECURSION':
        return `"${w.name}" bloğu kendini (dolaylı olarak) içeriyor; döngü kırıldı.`;
      case 'XREF_SKIPPED':
        return `"${w.name}" harici referans (XREF); dış dosyalar okunamaz, atlandı.`;
      case 'NO_GEOMETRY':
        return 'Dosyada kullanılabilir geometri bulunamadı.';
    }
  },

  importError(code: ImportErrorCode | 'WORKER_CRASHED' | 'READ_FAILED' | 'UNKNOWN', detail?: string): string {
    switch (code) {
      case 'EMPTY_FILE':
        return 'Dosya boş.';
      case 'BINARY_DXF':
        return 'İkili (binary) DXF desteklenmiyor. CAD programınızda dosyayı ASCII DXF olarak kaydedin.';
      case 'PARSE_FAILED':
        return `Dosya DXF olarak okunamadı. Dosya bozuk olabilir.${detail ? ` (Ayrıntı: ${detail})` : ''}`;
      case 'READ_FAILED':
        return 'Dosya okunamadı.';
      case 'WORKER_CRASHED':
        return 'Hesaplama sırasında beklenmeyen bir hata oluştu. Dosyayı tekrar yüklemeyi deneyin.';
      default:
        return `Beklenmeyen hata${detail ? `: ${detail}` : '.'}`;
    }
  },
};

export type Strings = typeof tr;
