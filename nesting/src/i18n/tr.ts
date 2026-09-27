/**
 * Tüm arayüz metinleri. İleride `en.ts` aynı şekli (typeof tr) uygulayarak
 * eklenebilir.
 */
import type { ImportErrorCode, ImportWarning } from '../core/dxf/types';
import type { MaterialId } from '../core/materials';
import type { RotationMode } from '../core/placement/rotations';
import type { UnplacedReason } from '../core/placement/types';

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

  partSettings: {
    quantity: 'Adet',
    rotation: 'Dönüş',
    rotationModes: {
      none: 'Sadece 0°',
      half: '0° / 180°',
      quarter: '0° / 90° / 180° / 270°',
      free: 'Serbest',
    } satisfies Record<RotationMode, string>,
    step: 'Adım (°)',
    mirror: 'Ayna',
    mirrorTitle: 'Parçanın aynalanmış hali de kullanılabilir',
    priority: 'Öncelik',
    priorities: ['Normal', 'Yüksek', 'Acil'],
  },

  tabs: {
    parts: 'Parçalar',
    sheet: 'Sac ve kesim',
  },

  sheet: {
    heading: 'Sac',
    template: 'Sac ölçüsü',
    templates: {
      '1000x2000': '1000 × 2000',
      '1250x2500': '1250 × 2500',
      '1500x3000': '1500 × 3000',
      custom: 'Özel ölçü',
    },
    sizeY: 'Genişlik (Y)',
    sizeX: 'Uzunluk (X)',
    count: 'Sac adedi',
    unlimited: 'Sınırsız',
    margin: 'Kenar payı',
    cutting: 'Kesim',
    gap: 'Parçalar arası boşluk',
    kerf: 'Kerf (kesim genişliği)',
    material: 'Malzeme',
    thickness: 'Kalınlık',
    reportOnly: 'Malzeme ve kalınlık yalnızca rapor ve fire ağırlığı için kullanılır.',
    gravity: 'Yerleştirme yönü',
    gravities: { left: 'Sola (X boyunca)', down: 'Aşağıya (Y boyunca)' },
    advanced: 'Gelişmiş',
    simplify: 'Sadeleştirme toleransı',
    simplifyHint: 'Büyük değer hesabı hızlandırır ama parçalar arasında biraz daha fazla boşluk bırakır.',
    offsetHint: (d: string) => `Her parça dışa ${d} mm şişirilir (kerf/2 + boşluk/2 + güvenlik payı).`,
    mm: 'mm',
  },

  materials: {
    dkp: 'DKP / ST37',
    galvaniz: 'Galvaniz',
    paslanmaz304: 'Paslanmaz (304)',
    aluminyum: 'Alüminyum',
    bakir: 'Bakır',
    pirinc: 'Pirinç',
  } satisfies Record<MaterialId, string>,

  nest: {
    start: 'Başlat',
    stop: 'Durdur',
    running: 'Yerleştiriliyor…',
    noParts: 'Yerleştirilecek parça yok (adetleri kontrol edin).',
    stale: 'Ayarlar değişti — sonucu güncellemek için yeniden başlatın.',
    failed: (detail?: string) => `Yerleştirme sırasında bir hata oluştu. Lütfen tekrar deneyin.${detail ? ` (Ayrıntı: ${detail})` : ''}`,
    validationFailed: 'Uyarı: yerleşimde çakışma tespit edildi. Bu bir yazılım hatasıdır; lütfen bildirin.',
    method: 'Yöntem: kutu (bounding-box) yerleştirme — referans. Gerçek şekil yerleştirme sonraki aşamada.',
  },

  metrics: {
    heading: 'Sonuç',
    importHeading: 'İçe aktarma',
    fileCount: 'Dosya',
    partTypes: 'Parça tipi',
    totalCopies: 'Toplam adet',
    totalArea: 'Toplam parça alanı',
    openContours: 'Açık kontur',
    warnings: 'Uyarı',
    sheetsUsed: 'Kullanılan sac',
    efficiency: 'Toplam verim',
    lastSheetEfficiency: 'Son sac verimi',
    lastSheetLength: 'Son sacta kullanılan uzunluk',
    scrapArea: 'Fire alanı',
    scrapWeight: 'Tahmini fire ağırlığı',
    unplaced: 'Yerleştirilemeyen',
    elapsed: 'Süre',
    placed: (a: number, b: number) => `${a} / ${b} parça yerleşti`,
    unplacedReason: {
      TOO_LARGE: 'saca sığmıyor',
      NO_SHEET_LEFT: 'sac adedi yetmedi',
    } satisfies Record<UnplacedReason, string>,
  },

  view: {
    parts: 'Parçalar',
    sheets: 'Yerleşim',
    sheetTab: (i: number) => `Sac ${i}`,
    showOffset: 'Offset sınırını göster',
    noResult: 'Henüz yerleşim yok. "Başlat" ile hesaplayın.',
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
    m2: (mm2: number) => `${nf2.format(mm2 / 1e6)} m²`,
    percent: (r: number) => `%${nf.format(r * 100)}`,
    kg: (v: number) => `${nf.format(v)} kg`,
    seconds: (ms: number) => `${nf2.format(ms / 1000)} sn`,
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
