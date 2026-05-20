# 👥 Takım Görevleri — Aksiyon Listesi

> **Güncelleme:** 2026-05-16
> **Hazırlayan:** Semih
> **Hedef:** Bu dosyayı her sprint başında güncelleyin. Tamamlanan maddeyi `[x]` ile işaretleyin, üzerini çizmeyin.

---

## 0. Mevcut Sistem Durumu

| Katman | Durum | Sorumlu |
|---|---|---|
| Backend (Flask + SQLite) | ✅ Çalışıyor, tüm Semih endpoint'leri canlı | Semih |
| Sensor simulator (random / step / demo) | ✅ Üç mod ayrıldı | Semih |
| EEM LTspice sinyali entegrasyonu | ✅ B01 kutusuna uygulanır, 3 endpoint | Semih |
| API doğrulama (404 / 400) | ✅ `bin_id`, `fill_level`, `t` kontrol ediliyor | Semih |
| Veritabanı şeması + seed | ✅ İdempotent seed, `reset_bins()` ayrı | Semih |
| Frontend HTML/CSS | ✅ İd uyumsuzlukları giderildi, EEM paneli eklendi | İshak |
| Frontend JS davranışı | ✅ Tüm butonlar (demo/random/step/reset/worker/route/auto) çalışıyor | İshak |
| EEM sinyali için frontend slider | ✅ Canvas grafiği + eşik çizgisi + slider + "Tüm Sinyali Uygula" | İshak |
| Yol ağı (`road_network.py`) | ✅ 9 node + Dijkstra + `road_path` çıktısı | Ulaş |
| Görevli servisi (`worker_service.py`) | ✅ State machine (idle/working/collecting), singleton | Ulaş |
| `/api/roads`, `/api/route/road`, `/api/worker*` | ✅ 7 endpoint bağlandı (Semih) | Ulaş + Semih |
| Test dosyaları (`test_api.py`) | ✅ 9 testin tümü PASS | Ulaş |
| Frontend `/api/route/road`'a geçişi | ✅ Worker yol ağını takip ediyor + yol arka planı gri çiziliyor | Semih |

---

## 1. Semih'in tamamladığı işler (referans için)

Aşağıdaki maddeler **tamamlandı**, sizin tekrar yapmanıza gerek yok:

- Flask uygulaması `port=5001`, CORS açık, `python3 app.py` ile ayağa kalkıyor.
- SQLite: `bins` ve `measurements` tabloları, foreign key dahil. DB yolu: `smart-waste-system/database/waste.db`.
- `database.get_db_connection`, `init_db`, `get_all_bins`, `get_bin`, `get_bins_for_collection`, `get_measurements`, `get_status_counts`, `save_measurement`, `update_bin_status`.
- `seed_data.insert_initial_bins()` (idempotent) ve `seed_data.reset_bins()` (sert sıfırlama).
- `sensor_simulator`: `generate_random_data`, `generate_step_data`, `generate_demo_distribution`, `calculate_status` ve geriye dönük uyumluluk için `generate_sensor_data`.
- `route_optimizer.calculate_route` (Manhattan + en yakın komşu, boş giriş kontrolü ile).
- Endpointler: `/api/health`, `/api/bins`, `/api/measurements`, `/api/collection-bins`, `/api/dashboard`, `/api/simulate`, `/api/simulate/random`, `/api/simulate/step`, `/api/simulate/demo`, `/api/simulate/<bin_id>`, `/api/external-data`, `/api/reset`, `/api/route`.
- EEM LTspice entegrasyonu: `electronics_signal.py` modülü + 3 endpoint (`GET /api/electronics-signal`, `POST /api/electronics-signal/apply`, `POST /api/simulate/electronics`). Sadece B01 kutusuna uygulanır.
- Ulaş'ın modüllerini app.py'a sarmalama (§3.4): `GET /api/route/road`, `GET /api/roads`, `GET /api/worker/status`, `GET /api/worker/route`, `POST /api/worker/start`, `POST /api/worker/collect/<bin_id>`, `POST /api/worker/reset`.
- API dokümantasyonu: `docs/api_documentation.md` güncel.
- Düzeltilen bug'lar:
  1. `seed_data.py` artık `database` modülünün bağlantısını kullanıyor (daha önce `backend/waste.db` ile `database/waste.db` farklı dosyalardı).
  2. Seed artık ölçüm geçmişini silmiyor (önceden her restart geçmişi sıfırlıyordu).
  3. `/api/route` adı koda ve frontend'e uydurulmuş şekilde dokümante edildi.
  4. `*.db` ve `database/` `.gitignore`'a eklendi.

---

## 2. İshak — Frontend

> **Durum:** P0 + P1'in büyük çoğunluğu tamam. Geriye sadece §2.7 (rotayı yol ağına bağlama) ve §2.6 (tarayıcı testi) kaldı.

### 2.1 [P0] HTML ve JS uyumsuzluğunu düzelt ✅

[frontend/script.js](../frontend/script.js) ile [frontend/index.html](../frontend/index.html) arasında **id eşleşmeyen** elemanlar var. Sayfa şu anda butonları dinlemiyor ve loglar görünmüyor.

| script.js'in aradığı id | HTML'de bulunan id | Aksiyon |
|---|---|---|
| `btn-simulate` | yok (sadece `btn-auto-toggle`) | Bir simülasyon butonu ekle veya `btn-auto-toggle`'a bağla |
| `route-info` | `route-panel` | İkisinden birini diğerine eşitle |
| `worker-log` | `log-panel` | İkisinden birini diğerine eşitle |

Önerilen yön: HTML'i kanonik kabul et, `script.js` içindeki id referanslarını güncelle. Çünkü yeni HTML, görsel olarak daha bütün (header + stats + sidebar).

Ayrıca bu butonlara işlev gerekiyor:
- [ ] `btn-auto-toggle` — `setInterval` ile her N saniyede `POST /api/simulate/random` çağıran toggle.
- [ ] `btn-reset` — `POST /api/reset` çağırıp haritayı yenile.
- [ ] `speed-slider` — `moveWorker` içindeki `setInterval(t, 60)` gecikmesini slider değerine göre ölçekle (1 = yavaş, 5 = hızlı).
- [ ] `bin-list` — `/api/bins` sonucundan kart listesi üret (her kutu için bin_id, name, doluluk, durum rozeti).

### 2.2 [P0] Demo butonları ✅

GELISTIRME_RAPORU planına göre demo akışı için ayrı butonlar isteniyor:

- [ ] **"Demo Verisi Üret"** butonu → `POST /api/simulate/demo` çağırır. Sonuç dağılımı garanti: 1 kritik + 2 sarı + 5 normal.
- [ ] **"Random Veri Üret"** butonu → `POST /api/simulate/random`.
- [ ] **"Step (Doluluğu Artır)"** butonu → `POST /api/simulate/step`. Her tıklamada doluluk 3–12 puan artar.

### 2.3 [P1] Dashboard kartları ✅

Şu anda kart sayıları `fetchBins()` içinde hesaplanıyor. Daha temiz olanı:

- [ ] `GET /api/dashboard` çağırıp `total_bins`, `normal`, `needs_collection`, `critical`, `collection_queue`, `measurement_count`, `last_measurement_at` değerlerini doğrudan göster.
- [ ] Header'daki "● CANLI" rozetini son ölçüm zamanı 30 saniyeden eskiyse soluk göster.

### 2.4 [P1] Marker ve popup iyileştirmeleri ✅

- [ ] Kritik (kırmızı) marker için yanıp sönen halka efekti (CSS animation).
- [ ] Popup içine doluluk progress bar ekle (`<div style="width:{fill}%">`).
- [ ] Popup'a "Bu kutuyu sıfırla" butonu → `POST /api/external-data` ile `fill_level=0` gönder.

### 2.5 [P1] EEM LTspice Sinyali UI ✅

EEM ekibinin sağladığı LTspice transient çıkışını B01 kutusu üzerinden göstermek için:

- [ ] Sayfaya küçük bir panel: "EEM Comparator Sinyali (B01)".
- [ ] 0–10 saniye arası slider. `oninput` → `POST /api/electronics-signal/apply?bin_id=B01&t={value}`.
- [ ] Slider üstünde mini bir voltaj-zaman grafiği (örn. `<canvas>` veya SVG polyline). Veri: `GET /api/electronics-signal?samples=51`. 2.5V eşik çizgisini yatay olarak göster.
- [ ] "Tüm Sinyali Uygula" butonu → `POST /api/simulate/electronics?bin_id=B01&samples=21`. B01'in geçmişine 21 ölçüm yazar, son durumu kritik olur.
- [ ] B01 marker'ı diğer kutulardan görsel olarak ayrılsın (örn. küçük "⚡ EEM" rozeti popup'ta).

Rapor için katma değer: "Frontend EEM ekibinin gerçek LTspice çıkışını canlı tüketiyor" gösterimi.

### 2.6 [P2] Tarayıcı uyumluluğu — DEMO ÖNCESİ KALAN İŞ

**Sorumlu: İshak.** Bu, geriye kalan tek aktif iş.

- [ ] **Chrome**'da `frontend/index.html` aç (`python3 -m http.server 8000` üstünden), bütün akışı dene: demo veri, rota göster, görevli gönder, EEM slider, kutu sıfırla.
- [ ] Aynı kontrolü **Firefox**'ta tekrarla.
- [ ] Aynı kontrolü **Safari**'de tekrarla.
- [ ] Kontrol noktaları:
  - Marker renkleri ve `pulse` animasyonu (kritik kutular)
  - EEM canvas grafiği (eşik çizgisi + sinyal eğrisi)
  - Polyline mavi solid çiziliyor mu, yol ağını takip ediyor mu
  - Görevli (🚛) waypoint'leri sırayla yürüyor mu, off-road hop yapıyor mu
  - Popup'taki "Bu kutuyu sıfırla" butonu her tarayıcıda tetikleniyor mu
  - Slider'lar (hız + EEM) tepki veriyor mu
- [ ] Layout farklı ekran genişliklerinde (1280px, 1440px, 1920px) bozulmuyor.
- [x] Cache buster otomatik (`?v={Date.now()}`) — `index.html` script blok'unda.

### 2.7 [P1] Rotayı yol ağına bağla ✅

H5 hatası çözüldü. Yapılanlar:

- [x] `calculateRoute()` artık `/api/route/road` çağırıyor; polyline her durağın `path_nodes_from_previous` waypoint'lerinden + son hop'tan oluşuyor (`script.js:91-148`).
- [x] `runWorkerCycle()` her iterasyonda taze rota çekiyor, ilk ziyaret edilmemiş hedefin yol ağı node'larını sırayla yürüyor, ardından off-road hop ile kutuya gidip topluyor (`script.js:151-237`).
- [x] Polyline `dashArray` kaldırıldı, solid mavi.
- [x] **Bonus**: `/api/roads` ile gri yol ağı arka planı çizildi — kullanıcı worker'ın neden bu güzergahı izlediğini görsel olarak anlıyor (`script.js:413-446`).

---

## 3. Ulaş — Yol Ağı, Rota Optimizasyonu, Görevli Servisi

> **Durum:** P0 + P1 büyük ölçüde tamam. Geriye sadece frontend'in `/api/route/road`'a geçirilmesi (İshak §2.7) ve isteğe bağlı iyileştirmeler kaldı.

### 3.1 [P1] `road_network.py` ✅

- [x] `backend/road_network.py` (276 satır, 9 node + 9 edge).
- [x] `ROAD_NODES`, `ROAD_EDGES`, `BIN_NODE_MAP` tanımlı.
- [x] `find_nearest_node(x, y)` — Öklid mesafesiyle en yakın node.
- [x] `dijkstra_shortest_path(start, target)` — heapq ile en kısa yol.
- [x] Bonus: `calculate_real_road_route(bins, start_x, start_y, start_name)` — kutu sıralı tam rota.

### 3.2 [P1] Rota algoritmasını yol ağı üzerinden çalıştır ✅

- [x] `calculate_real_road_route` Dijkstra ile gerçek yol uzunluğunu hesaplıyor.
- [x] Çıktıda `road_path` (waypoint listesi) ve her durakta `path_nodes_from_previous` var → frontend polyline doğrudan bunu kullanabilir.
- [x] Önceliklendirme: `filter_bins_for_collection` kritik + sarı kutuları döndürür; nearest-neighbor sırası ile geziliyor.
- [ ] **İyileştirme** (opsiyonel): Aynı listede önce tüm kritikler, sonra sarılar gezilsin. Şu an saf en yakın komşu çalışıyor — bazı senaryolarda sarı kutu önce gelebilir.

### 3.3 [P0] `worker_service.py` ✅

- [x] `backend/worker_service.py` (168 satır, WorkerService class + singleton).
- [x] State: `{id, name, x, y, status (idle/working/collecting/route_ready), current_target, completed_bins, last_route, last_updated}`.
- [x] `get_status()`, `reset_worker()`, `create_route(bins)`, `start_route(bins)`, `move_to_bin(data)`, `complete_bin(bin_id)`, `finish_route()`, `simulate_full_worker_cycle(bins)`.

### 3.4 [P1] Semih ile birlikte: Worker / Roads endpoint'leri ✅

Modüller `app.py`'a bağlandı. Tam liste:

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET  | `/api/route/road` | Yol ağı + Dijkstra rotası, `road_path` ile |
| GET  | `/api/roads` | Yol ağı node + edge + bin eşlemesi (görselleştirme için) |
| GET  | `/api/worker/status` | Worker mevcut durumu |
| GET  | `/api/worker/route` | Worker konumundan yeni rota |
| POST | `/api/worker/start` | İlk hedefe yönlendir |
| POST | `/api/worker/collect/<bin_id>` | Kutuyu toplandı işaretle + DB'de sıfırla (404 kontrolü dahil) |
| POST | `/api/worker/reset` | Worker'ı depoya döndür |

### 3.5 [P2] Testler (`test_api.py`) ✅

- [x] `test_api.py` (152 satır, 9 test).
- [x] `/api/health`, `/api/bins`, `/api/simulate`, `/api/route`, `/api/route/road` mutlu yol testleri.
- [x] `/api/worker/status`, `/api/worker/route`, `/api/worker/start`, `/api/worker/reset` testleri.
- [x] **Tüm 9 test PASS** (Semih endpoint'leri bağladıktan sonra).
- [ ] **İyileştirme** (opsiyonel): 404/400 hata testleri (`/api/simulate/BOGUS`, `/api/external-data` `fill_level=200`, `/api/electronics-signal/apply?t=20`). Şu an sadece happy path.

---

### Bu Hafta / Önümüzdeki Hafta (güncel)

| Hafta | İshak | Ulaş |
|---|---|---|
| **Bu hafta** | §2.7 frontend'i `/api/route/road`'a geçir (H5 çözülür) | §3.2 önceliklendirme (kritik önce) — opsiyonel |
| **Önümüzdeki hafta** | §2.6 tarayıcı uyumluluğu testi | §3.5 hata yolu testleri — opsiyonel |
| **Demo haftası** | Ekran görüntüleri + demo provası | Demo provası + test çıktısı |

---

## 4. Ortak / Demo Hazırlığı — KALAN İŞLER

Kodlama büyük ölçüde bitti. Demo öncesi yapılacaklar:

| # | İş | Sorumlu | Detay |
|---|---|---|---|
| D1 | Tarayıcı uyumluluğu (§2.6) | **İshak** | Chrome / Firefox / Safari'de tüm akışı test et. Kontrol listesi §2.6'da. |
| D2 | Ekran görüntüleri | **İshak** | Akış: temiz başlangıç → demo veri → marker renkleri → rota çizimi → görevli hareketi → EEM slider eşik geçişi → toplama sonrası yeşil dönüş. En az 6–8 kare. |
| D3 | Demo videosu (opsiyonel) | İshak | Ekran kaydı + kısa anlatım. Yoksa ekran görüntüleri yeterli. |
| D4 | Test çıktısı (`docs/test_results.md`) | **Ulaş** | `python3 test_api.py` çıktısını ve manuel senaryo (reset → demo → route → worker → EEM apply) sonuçlarını dosyaya yaz. |
| D5 | Demo öncesi `POST /api/reset` | **Hepsi** | Demo başlamadan önce DB'yi temizle. İlk slayttan önce `curl -X POST http://127.0.0.1:5001/api/reset`. |
| D6 | Backend acil bug fix | **Semih** | Demo günü çıkabilecek hatalara müdahale. Şu an kod tarafında bekleyen iş yok. |
| D7 | Sunum anlatımı | **Hepsi** | [demo_scenario.md](demo_scenario.md)'daki akışa göre rolleri paylaş. |

**Semih için not:** Kod tarafında yapılacak iş kalmadı. Demo günü gözlem + hızlı müdahale.

### Demo Kabul Kriterleri (uçtan uca)

1. Random/demo veri üretimi ile kutuların anlık doluluk verisi değişiyor.
2. Çöp kutuları doluluğa göre yeşil/sarı/kırmızı olarak haritada güncelleniyor.
3. Görevli araç hedef kutulara en kısa rota üzerinden gidiyor ve toplama yapıyor.
4. Toplanan kutuların boşaltıldığı sisteme kaydediliyor ve yeşile dönüyor.
5. Dashboard ve aktivite logu olaylarla eşzamanlı güncelleniyor.

---

## 5. Bilinen Hatalar (Açık)

**Tüm bilinen hatalar çözüldü.** Referans için:

| # | Hata | Çözen | Yer |
|---|---|---|---|
| H1 | Harita markerları bazen güncellenmiyor | İshak | `script.js:230-244` (fetchBins + dashboard sync) |
| H2 | `step.name` undefined | Semih | DB satırı zaten `name` döndürüyor |
| H3 | Görevli aktifken simülasyon çakışıyor | Ulaş | `worker_service` state machine |
| H4 | Rota çizgisi simülasyon sonrası silinmiyor | İshak | `script.js:98` (`map.removeLayer(routeLayer)`) |
| H5 | Araç düz çizgi ile gidiyor (yolu takip etmiyor) | Semih + Ulaş | `script.js:91-237` + `/api/route/road` (Dijkstra waypoint'leri) |
| H6 | Tarayıcı cache eski script.js kullanıyor | İshak | `index.html:117-127` (`?v={Date.now()}`) |

---

## 6. Bilinen Tuzaklar

1. **DB yolu**: `database.py` `database/waste.db` kullanıyor. Hiçbir dosyada `sqlite3.connect('waste.db')` gibi göreli yol KULLANMA — her zaman `database.get_db_connection()`.
2. **Seed idempotent**: `insert_initial_bins()` sadece tablo boşsa ekler. Tüm verileri sıfırlamak için `seed_data.reset_bins()` veya `POST /api/reset`.
3. **Cache**: Tarayıcı eski `script.js`'i tutabilir. `index.html` içindeki `?v=N` parametresini her UI değişikliğinde artır.
4. **Port 5001**: Backend `127.0.0.1:5001`'de çalışır. Frontend `localhost:8000`'den fetch atarken CORS açık, sorun olmaz.
5. **Saat dilimi**: Tüm `timestamp`'lar `datetime.now().isoformat(timespec="seconds")` — lokal saat, UTC değil. Demo sırasında saat farkı görmek normal.

---

## 7. İletişim

- **Repo:** https://github.com/semihbekdas/takimprojesi
- **Branch stratejisi:** Her geliştirici kendi branch'inde çalışır (`frontend-ishak`, `routing-ulas`), PR ile main'e merge.
- **Konflikt olursa:** Backend'i Semih, frontend'i İshak, rota/worker'ı Ulaş çözer. Diğerleri sadece review yapar.
