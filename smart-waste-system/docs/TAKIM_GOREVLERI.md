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
| Frontend HTML/CSS | ⚠️ Yeni tasarım var, ama JS uyumsuz | İshak |
| Frontend JS davranışı | ❌ HTML id'lerinden 3 tanesi eşleşmiyor | İshak |
| EEM sinyali için frontend slider | ❌ UI yok (B01 için 0–10 sn slider) | İshak |
| Yol ağı (`road_network.py`) | ❌ Dosya yok | Ulaş |
| Görevli servisi (`worker_service.py`) | ❌ Dosya yok | Ulaş |
| `/api/roads`, `/api/worker*` | ❌ Endpoint yok (Ulaş modülleri hazır olunca eklenecek) | Ulaş + Semih |
| Test dosyaları (`test_api.py`) | ❌ Yok | Ulaş |

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
- API dokümantasyonu: `docs/api_documentation.md` güncel.
- Düzeltilen bug'lar:
  1. `seed_data.py` artık `database` modülünün bağlantısını kullanıyor (daha önce `backend/waste.db` ile `database/waste.db` farklı dosyalardı).
  2. Seed artık ölçüm geçmişini silmiyor (önceden her restart geçmişi sıfırlıyordu).
  3. `/api/route` adı koda ve frontend'e uydurulmuş şekilde dokümante edildi.
  4. `*.db` ve `database/` `.gitignore`'a eklendi.

---

## 2. İshak — Frontend (Acil → Sonra)

### 2.1 ACİL: HTML ve JS uyumsuzluğunu düzelt

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

### 2.2 Demo butonları

GELISTIRME_RAPORU planına göre demo akışı için ayrı butonlar isteniyor:

- [ ] **"Demo Verisi Üret"** butonu → `POST /api/simulate/demo` çağırır. Sonuç dağılımı garanti: 1 kritik + 2 sarı + 5 normal.
- [ ] **"Random Veri Üret"** butonu → `POST /api/simulate/random`.
- [ ] **"Step (Doluluğu Artır)"** butonu → `POST /api/simulate/step`. Her tıklamada doluluk 3–12 puan artar.

### 2.3 Dashboard kartları

Şu anda kart sayıları `fetchBins()` içinde hesaplanıyor. Daha temiz olanı:

- [ ] `GET /api/dashboard` çağırıp `total_bins`, `normal`, `needs_collection`, `critical`, `collection_queue`, `measurement_count`, `last_measurement_at` değerlerini doğrudan göster.
- [ ] Header'daki "● CANLI" rozetini son ölçüm zamanı 30 saniyeden eskiyse soluk göster.

### 2.4 Marker ve popup iyileştirmeleri

- [ ] Kritik (kırmızı) marker için yanıp sönen halka efekti (CSS animation).
- [ ] Popup içine doluluk progress bar ekle (`<div style="width:{fill}%">`).
- [ ] Popup'a "Bu kutuyu sıfırla" butonu → `POST /api/external-data` ile `fill_level=0` gönder.

### 2.5 EEM LTspice Sinyali UI (yeni)

EEM ekibinin sağladığı LTspice transient çıkışını B01 kutusu üzerinden göstermek için:

- [ ] Sayfaya küçük bir panel: "EEM Comparator Sinyali (B01)".
- [ ] 0–10 saniye arası slider. `oninput` → `POST /api/electronics-signal/apply?bin_id=B01&t={value}`.
- [ ] Slider üstünde mini bir voltaj-zaman grafiği (örn. `<canvas>` veya SVG polyline). Veri: `GET /api/electronics-signal?samples=51`. 2.5V eşik çizgisini yatay olarak göster.
- [ ] "Tüm Sinyali Uygula" butonu → `POST /api/simulate/electronics?bin_id=B01&samples=21`. B01'in geçmişine 21 ölçüm yazar, son durumu kritik olur.
- [ ] B01 marker'ı diğer kutulardan görsel olarak ayrılsın (örn. küçük "⚡ EEM" rozeti popup'ta).

Rapor için katma değer: "Frontend EEM ekibinin gerçek LTspice çıkışını canlı tüketiyor" gösterimi.

### 2.6 Tarayıcı uyumluluğu

- [ ] Chrome / Firefox / Safari'de açıp marker rengi, animasyon, layout testi yap.
- [ ] `index.html` içindeki `?v=5` cache buster'ı her commit'te artır ya da `?v={timestamp}` kullan.

---

## 3. Ulaş — Yol Ağı, Rota Optimizasyonu, Görevli Servisi

Bu kısım Semih backend ile koordineli yürüyor. Önce kendi modüllerini yaz, sonra Semih ile endpoint'i bağlayın.

### 3.1 `road_network.py`

- [ ] `backend/road_network.py` oluştur.
- [ ] Node listesi: yol kesişimleri (örn. `(0,0)` depo, `(25,0)`, `(50,0)`, `(75,0)`, `(0,25)`, ..., `(75,75)`).
- [ ] Edge listesi: hangi node hangi node ile bağlı (yol var mı?).
- [ ] Her kutuya en yakın node'u eşle: `bin_to_node = {"B01": (25, 75), ...}`.
- [ ] `get_road_network() -> {"nodes": [...], "edges": [...]}` fonksiyonu.
- [ ] `shortest_path(from_node, to_node) -> [list of nodes]` — Dijkstra ya da BFS (grid uniform-cost ise BFS yeterli).

### 3.2 Rota algoritmasını yol ağı üzerinden çalıştır

Şu anki `route_optimizer.calculate_route` düz Manhattan mesafesi kullanıyor; gerçek yol takip etmiyor.

- [ ] Yeni fonksiyon: `calculate_route_on_roads(bins, start, road_network)`.
- [ ] Her segment için Dijkstra'dan gerçek yol uzunluğunu al, toplam mesafeyi onunla hesapla.
- [ ] Çıktıya `path_coordinates: [{"x":..,"y":..}, ...]` ekle — frontend'in polyline çizimi bunu kullanacak.
- [ ] Kritik (kırmızı) kutulara `needs_collection` (sarı) kutulardan önce öncelik ver. Aynı sınıf içinde en yakın komşu kuralı geçerli.

### 3.3 `worker_service.py`

Görevli aracın durum makinesini backend'e taşı.

- [ ] `backend/worker_service.py` oluştur.
- [ ] State: `{"position": {"x":0,"y":0}, "status": "idle|moving|collecting", "target_bin_id": None|"B0X", "collected_count": 0}`.
- [ ] `get_state()` — mevcut durumu döndürür.
- [ ] `mark_collected(bin_id)` — kutuyu %0–10 arası sıfırlayıp `collected_count`'u artırır, sonraki hedefe geçer.
- [ ] `reset_to_depot()` — pozisyonu (0,0)'a alır, status idle.

### 3.4 Semih ile birlikte: Worker / Roads endpoint'leri

Modüller yazıldıktan sonra Semih bunları `app.py`'a bağlayacak. Plan:

| Metot | Endpoint | İçi |
|---|---|---|
| GET | `/api/roads` | `road_network.get_road_network()` |
| GET | `/api/worker` | `worker_service.get_state()` |
| POST | `/api/worker/collect/<bin_id>` | `worker_service.mark_collected(bin_id)` (404 kontrolü Semih'te) |
| POST | `/api/worker/reset` | `worker_service.reset_to_depot()` |

Ulaş modülleri PR olarak açtığında Semih 30 dk içinde endpoint'leri ekler.

### 3.5 Testler (`test_api.py`)

- [ ] `pytest` veya basit `unittest` ile başla.
- [ ] `/api/health`, `/api/bins`, `/api/simulate/random`, `/api/route`, `/api/reset` mutlu yol testi.
- [ ] `POST /api/simulate/BOGUS` → 404 testi.
- [ ] `POST /api/external-data` ile `fill_level=200` → 400 testi.
- [ ] Demo senaryosu: reset → simulate/demo → route → en az 3 stop dönmeli.
- [ ] Görevli çakışma testi: `worker_service` aktifken `simulate/random` yine çağrılabilmeli (backend bloklamıyor; frontend bloklasın).

---

## 4. Ortak / Demo Hazırlığı

| Sorumlu | İş |
|---|---|
| Hepsi | Demo öncesi `POST /api/reset` çalıştırıp temiz başlangıç. |
| İshak | Demo videosu / ekran görüntüleri (yeşil → sarı → kırmızı → rota → boşaltma akışı). |
| Ulaş | Test çıktılarını `docs/test_results.md` dosyasına ekle. |
| Semih | Hata raporları gelirse backend tarafında bug fix. |

### Demo Kabul Kriterleri (uçtan uca)

1. Random/demo veri üretimi ile kutuların anlık doluluk verisi değişiyor.
2. Çöp kutuları doluluğa göre yeşil/sarı/kırmızı olarak haritada güncelleniyor.
3. Görevli araç hedef kutulara en kısa rota üzerinden gidiyor ve toplama yapıyor.
4. Toplanan kutuların boşaltıldığı sisteme kaydediliyor ve yeşile dönüyor.
5. Dashboard ve aktivite logu olaylarla eşzamanlı güncelleniyor.

---

## 5. Bilinen Hatalar (Açık)

| # | Hata | Sorumlu | Çözüm |
|---|---|---|---|
| H1 | Harita markerları bazen güncellenmiyor | İshak | Marker refresh ve cache buster (`?v=` artır). |
| H3 | Görevli aktifken simülasyon çakışıyor | Ulaş | Worker state machine + frontend buton disable. |
| H4 | Rota çizgisi simülasyon sonrası silinmiyor | İshak | Yeni rota öncesi eski `routeLayer`'ı `map.removeLayer` ile temizle. |
| H5 | Araç düz çizgi ile gidiyor (yolu takip etmiyor) | Ulaş + İshak | Rota çıktısına `path_coordinates` ekle, frontend polyline'ı bu listeden çizsin. |
| H6 | Tarayıcı cache eski `script.js` kullanıyor | İshak | `index.html` içindeki `?v=N` parametresini her UI değişikliğinde artır. |

> H2 (`step.name` undefined) Semih tarafında çözüldü — bin satırı zaten `name` alanını döndürüyor.

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
