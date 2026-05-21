# Akıllı Kampüs Atık Yönetim ve Takip Sistemi

> MDB308 Çok Disiplinli Takım Projesi · BM + EEM + END  
> Repo: https://github.com/semihbekdas/takimprojesi

---

## Proje Özeti

Bu proje, kampüs içindeki çöp kutularının doluluk durumunu izleyen, toplanması gereken kutuları belirleyen ve görevli araçlar için yol ağı üzerinden rota oluşturan bir karar destek prototipidir.

Sistem üç temel veri kaynağıyla çalışır:

- `B01`: EEM ekibinin LTspice transient çıktısı ile çalışan özel kutu.
- `B02`-`B12`: Yazılım tarafında üretilen random / step / demo sensör verileri.
- Yol ağı: Kutuların X/Y koordinatlarına bağlı, yatay/dikey/çapraz bağlantılı kampüs grafı.

---

## Güncel Özellikler

- 12 çöp kutusu (`B01`-`B12`).
- B01 sadece EEM sinyali ile değişir.
- Random, step ve demo modları sadece `B02`-`B12` kutularını etkiler.
- 0-100 X/Y koordinatlı kare harita.
- Leaflet ve kampüs görseli yerine doğrudan koordinat tabanlı çizim.
- Yol ağı gri çizgilerle, aktif rota renkli çizgilerle gösterilir.
- 1-5 arası görevli araç seçilebilir.
- Çoklu araçlarda her aracın rota rengi farklıdır.
- Görev dağıtımı dengelidir; yakın kutular mümkünse aynı araca atanır.
- Araçlar yol ağı dışına çıkmadan hareket eder ve depoya da yol ağı üzerinden döner.
- Kritik kutular önce toplanır.
- Toplanan kutular veritabanında sıfırlanır ve yeşile döner.

---

## Sistem Mimarisi

```text
EEM LTspice sinyali (B01)
        |
        v
Flask REST API ---- SQLite ---- Frontend X/Y koordinat haritası
        ^
        |
Random / step / demo simülasyonları (B02-B12)
```

Backend `127.0.0.1:5001` üzerinde, frontend `localhost:8000` üzerinde çalışır.

---

## Doluluk Mantığı

| Doluluk | Voltaj | Alarm | Durum | Renk |
|---:|---:|---:|---|---|
| 0-49 | 0.00-2.45V | 0 | `normal` | Yeşil |
| 50-79 | 2.50-3.95V | 1 | `needs_collection` | Sarı |
| 80-100 | 4.00-5.00V | 1 | `critical` | Kırmızı |

Formül:

```text
voltage = fill_level / 100 * 5
alarm = 1 if fill_level >= 50 else 0
```

EEM tarafındaki 2.5V karşılaştırıcı eşiği yazılımda %50 doluluk eşiğine karşılık gelir.

---

## EEM Verisini Nasıl Kullanıyoruz?

EEM ekibinin verdiği `Draft2.txt` çıktısı projede şu dosya olarak tutulur:

```text
backend/data/electronics_signal.tsv
```

Bu dosya 0-10 saniye arasında 0V'dan 5V'a çıkan LTspice transient sinyalidir. Yazılım bunu sadece B01 kutusuna uygular.

Endpointler:

- `GET /api/electronics-signal?samples=51`
- `POST /api/electronics-signal/apply?bin_id=B01&t=5.0`
- `POST /api/simulate/electronics?bin_id=B01&samples=21`

Örnek:

```text
t=0  -> B01 %0, normal
t=5  -> B01 %50, needs_collection
t=8  -> B01 %80, critical
t=10 -> B01 %100, critical
```

Bu yüzden B01 random/demo/step ile değişmez. Bu ayrım raporda “1 gerçek EEM prototipi + 11 yazılım simülasyonu” şeklinde anlatılmalıdır.

---

## Klasör Yapısı

```text
smart-waste-system/
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── seed_data.py
│   ├── sensor_simulator.py
│   ├── electronics_signal.py
│   ├── road_network.py
│   ├── worker_service.py
│   ├── route_optimizer.py
│   └── data/electronics_signal.tsv
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── database/
│   └── waste.db
└── docs/
    ├── TAKIM_GOREVLERI.md
    ├── api_documentation.md
    ├── bm_random_sensor_proje_plani.md
    ├── demo_scenario.md
    └── report_notes.md
```

---

## Kurulum

```bash
git clone https://github.com/semihbekdas/takimprojesi.git
cd takimprojesi/smart-waste-system/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Çalıştırma

Terminal 1:

```bash
cd smart-waste-system/backend
source venv/bin/activate
python3 app.py
```

Terminal 2:

```bash
cd smart-waste-system/frontend
python3 -m http.server 8000
```

Aç:

```text
http://localhost:8000
```

Eski JavaScript kalırsa `Cmd+Shift+R` ile hard refresh yap.

---

## Hızlı Test

```bash
curl http://127.0.0.1:5001/api/health
curl -X POST http://127.0.0.1:5001/api/reset
curl -X POST http://127.0.0.1:5001/api/simulate/demo
curl -X POST "http://127.0.0.1:5001/api/electronics-signal/apply?bin_id=B01&t=8"
```

Beklenen:

- `/api/health` -> `ok`
- `/api/reset` -> 12 kutu normal
- `/api/simulate/demo` -> B01 hariç kutular için demo verisi
- EEM `t=8` -> B01 kritik

---

## API Özeti

Detay: [docs/api_documentation.md](docs/api_documentation.md)

| Kategori | Endpointler |
|---|---|
| Genel | `/api/health`, `/api/bins`, `/api/dashboard`, `/api/measurements`, `/api/collection-bins` |
| Simülasyon | `/api/simulate/random`, `/api/simulate/step`, `/api/simulate/demo`, `/api/simulate/<bin_id>` |
| EEM | `/api/electronics-signal`, `/api/electronics-signal/apply`, `/api/simulate/electronics` |
| Rota | `/api/route/road`, `/api/road-path`, `/api/roads` |
| Worker | `/api/worker/status`, `/api/worker/route`, `/api/worker/start`, `/api/worker/collect/<bin_id>`, `/api/worker/reset` |
| Yönetim | `/api/reset`, `/api/external-data` |

---

## Takım

| Kişi | Sorumluluk | Durum |
|---|---|---|
| Semih Bekdaş | Backend, REST API, SQLite, EEM entegrasyonu, frontend düzeltmeleri, yol/rota entegrasyonu, çoklu araç demo davranışı | Tamamlandı |
| İshak Türk | Frontend görsel kontrol, ekran görüntüleri, demo provası | Devam |
| Ulaş Yalçın | Yol ağı/worker katkısı, test çıktıları | Devam |
| Zeynep Baysal | EEM op-amp karşılaştırıcı devresi | Tamamlandı |
| Buse Hatice Merdamert | LTspice transient analizi | Tamamlandı |
| Eılaf Kasem | END literatür ve matematiksel model | Devam |

---

## Demo Kabul Kriterleri

- 12 kutu haritada görünür.
- B01 sadece EEM slider ile değişir.
- Random/demo/step B02-B12 üzerinde çalışır.
- Kritik ve sarı kutular doğru renkte görünür.
- Rota yol ağı üzerinde çizilir.
- Araçlar yol olmayan yerlerden gitmez.
- Çoklu araçlarda rota renkleri farklıdır.
- Görev dağıtımı dengelidir.
- Toplanan kutular yeşile döner.
- Dashboard ve log eşzamanlı güncellenir.
