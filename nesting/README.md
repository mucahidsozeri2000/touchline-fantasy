# Sac Nesting

Lazer/plazma kesim atölyeleri için tarayıcıda çalışan sac metal nesting
(yerleştirme) uygulaması.

**Gizlilik:** Tüm hesaplama kullanıcının tarayıcısında yapılır. Çizimler hiçbir
sunucuya gönderilmez; uygulamada ağ isteği, analytics veya harici API yoktur.
Bu kural üç katmanda korunur:

1. `eslint.config.js`: `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`…
   kullanımı derleme öncesi hata verir.
2. `tests/no-network.test.ts`: kaynak kodu aynı API'ler ve harici URL'ler için
   tarar.
3. Üretim derlemesine eklenen CSP (`connect-src 'self'`, `vite.config.ts`):
   tarayıcı harici istekleri çalışma zamanında engeller.

## Çalıştırma

```bash
cd nesting
npm install
npm run dev        # geliştirme sunucusu → http://localhost:5173
npm test           # birim testleri (Vitest)
npm run lint       # ESLint (ağ yasağı + core bağımsızlığı kuralları dahil)
npm run typecheck  # TypeScript strict
npm run build      # üretim derlemesi → dist/ (statik dosyalar, sunucu gerekmez)
npm run fixtures   # tests/fixtures/*.dxf dosyalarını yeniden üretir
```

## Durum

| Kilometre taşı | Durum |
| --- | --- |
| M1: İskelet, DXF okuma, canvas'ta gösterme | ✅ |
| M2: Offset, sadeleştirme, bounding-box yerleştirme | — |
| M3: NFP, IFP, bottom-left, çakışma doğrulaması | — |
| M4: Genetik algoritma, worker havuzu, canlı güncelleme | — |
| M5: Delik içine yerleştirme | — |
| M6: DXF/PDF çıktı, proje kaydet/aç | — |
| M7: Benchmark, performans, arayüz cilası | — |

## Mimari

```
src/
  core/            saf TypeScript: React/DOM bağımlılığı yok (ESLint ile zorlanır)
    geometry/      Vec2, Ring, BBox, afin dönüşüm, alan, nokta-poligon testi
    dxf/           okuma → normalizasyon → zincirleme → hiyerarşi → parçalar
    export/        DXF metin üreticisi (şimdilik fixture/örnek; M6'da R12 çıktı)
    nfp/ placement/ optimizer/   (sonraki aşamalar)
  workers/         DXF okuma worker'ı (Comlink)
  state/           Zustand store
  ui/              React bileşenleri, canvas görünümü
  i18n/tr.ts       tüm arayüz metinleri
  samples/         programatik örnek/test DXF üreticileri
tests/             Vitest testleri + fixtures/
```

### DXF içe aktarma hattı (`src/core/dxf`)

1. **Okuma**: `dxf-parser`. CIRCLE, ELLIPSE, LWPOLYLINE ve SPLINE için
   kendi okuyucularımız kayıtlı (`handlers.ts`). Kütüphanenin yerleşik
   okuyucuları aynalı entity'lerin extrusion yönünü ve spline ağırlıklarını
   atıyor, LWPOLYLINE köşelerini de bazı dosyalarda erken kesiyor.
2. **Birim**: `$INSUNITS` → mm. Tanımsız veya 0 ise mm varsayılır ve uyarı
   verilir. Kullanıcı birimi dosya başına elle değiştirebilir.
3. **Normalizasyon** (`normalize.ts`): entity'ler dört segment tipine
   indirgenir: `line`, `arc`, `ellipse`, `poly`.
   - Yaylar ve elipsler **analitik** olarak saklanır; poligon yalnızca hesap için
     türetilir. Çıktıda yaylar yay olarak yazılabilecek.
   - OCS (extrusion Z = −1) ve INSERT/BLOCK dönüşümleri (dönüş, ölçek, ayna,
     MINSERT dizisi, iç içe bloklar) uygulanır.
   - Düzgün olmayan ölçekli bloklarda daireler tam doğrulukla elipse dönüşür.
4. **Ayrıklaştırma**: kiriş sapması ≤ 0,05 mm olacak şekilde segment sayısı
   yarıçapa göre hesaplanır: `θ ≤ 2·acos(1 − tol/r)`. SPLINE'lar de Boor
   (NURBS, ağırlıklı) ile uyarlamalı bölünür.
5. **Zincirleme** (`chain.ts`): uç noktalar tolerans (0,01 mm) boyutlu ızgaraya
   konur ve uç uca yürünür (O(n)).
   - Kopya çizgiler ve sıfır boylu segmentler atılır.
   - İkiden fazla ucun birleştiği noktalar "belirsiz kavşak" olarak raporlanır.
6. **Hiyerarşi** (`hierarchy.ts`): her kontur, onu içeren en küçük konturun
   çocuğudur.
   - Çift derinlik = parça, tek derinlik = delik.
   - Delik içindeki parça ayrı parça olarak çıkar.
7. **Parça**: dış kontur CCW, delikler CW yönlendirilir. Koordinatlar yerel
   çerçeveye taşınır (bbox sol-alt = 0,0); DXF'teki konum `origin`'de saklanır.

Kapanmayan konturlar parça yapılmaz: canvas'ta kırmızı çizilir (uçları
noktalı) ve uyarı verilir. Hatalı dosyalarda uygulama çökmez; Türkçe hata
mesajı gösterilir.

## Bilinen Kısıtlar

- **Kiriş yaklaşımı içeride kalır.** Ayrıklaştırılmış noktalar gerçek eğri
  üzerindedir. Bu yüzden dışbükey kısımlarda poligon gerçek şeklin en fazla
  0,05 mm içinde kalır. Nesting güvenliği için M2'de parça offset'ine bu
  tolerans eklenecek. Parça ölçüleri (bbox) de aynı nedenle eğrili kenarlarda
  en fazla 0,05 mm küçük gösterilebilir.
- **Kesişen konturlar** desteklenmez. Konturların ya iç içe ya ayrık olduğu
  varsayılır; kesişen konturlarda parça/delik ayrımı tanımsızdır.
- **Belirsiz kavşaklar** (T birleşimleri, aynı köşeyi paylaşan konturlar)
  açgözlü seçimle çözülür. Önce aynı entity'nin devamı, sonra en yakın uç
  seçilir, kullanıcı uyarılır. Karmaşık çizimlerde sonuç kontrol edilmeli.
- **Yalnızca fit noktalı SPLINE'lar** fit noktalarından geçen çoklu çizgiyle
  yaklaşılır. Teğet ve knot bilgisi olmadan gerçek eğri kurulamaz; uyarı
  verilir.
- **SPLINE ve ELLIPSE çıktıda:** R12 formatında SPLINE ve ELLIPSE entity'si
  yoktur. Bunlar M6 çıktısında çoklu çizgi olarak yazılacak. LINE ve ARC/CIRCLE
  entity'leri olduğu gibi kalır.
- **Eğik düzlemdeki entity'ler** (extrusion normali Z'ye paralel değil) sadece
  XY'ye izdüşürülür ve uyarı verilir.
- **Desteklenmeyen / yok sayılanlar:** TEXT, MTEXT, DIMENSION, HATCH, POINT,
  SOLID ve benzeri geometri olmayan öğeler sayılıp atlanır. Mesh polyline,
  XREF ve ikili (binary) DXF de desteklenmez.
- **Katmanlar:** Tüm katmanlar içe alınır; katman filtresi henüz yok. Kapalı
  veya dondurulmuş katmanlar da okunur.
- **Metin kodlaması:** Dosyalar UTF-8 olarak okunur. Eski ANSI (cp1254) DXF'lerde
  yalnızca yazı içerikleri etkilenir; geometri etkilenmez.
- **Büyük dosyalar:** okuma worker'da yapılır. Ölçüm: 16.000 entity ve 2.000
  parça yaklaşık 1 sn. Hiyerarşi kurulumu kontur sayısında en kötü O(n²)'dir;
  gerekirse uzamsal indeksle hızlandırılabilir.
- **İleride NFP:** NFP içindeki boşluklar (holes) ilk sürümde yok sayılacak (M3).
