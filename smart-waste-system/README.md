# Akıllı Kampüs Atık Yönetim ve Takip Sistemi

> MDB308 Çok Disiplinli Takım Projesi · BM + EEM + END
> **Bu repo:** Bilgisayar Mühendisliği (BM) ekibinin geliştirdiği yazılım prototipi.
> Repo: https://github.com/semihbekdas/takimprojesi

---

## 1. Proje Nedir?

Geleneksel atık toplama sistemlerinde araçlar sabit rotalarda dolaşıyor ve çöp kutularının doluluk bilgisi olmadığı için boş kutuya da gidiliyor — bu hem iş gücü hem yakıt israfı. Bu projede kampüs içi çöp kutularına sensör konulduğunu varsayıp:

1. Kutuların **doluluk seviyesini** anlık takip eden,
2. Belirli bir eşiği geçen kutuları **otomatik tespit eden**,
3. Bu kutular için **toplama rotası öneren**,
4. Tüm bunları **harita üzerinde görselleştiren**

bir karar destek sistemi geliştirildi.

### Üç disiplin neyi yapıyor?

| Disiplin | Rol | Çıktı |
|---|---|---|
| **EEM** (Zeynep, Buse) | Op-Amp karşılaştırıcı devresi | LTspice'ta tasarlanmış devre + 0–10 sn transient çıkışı (`Draft2.txt`) |
| **BM** (Semih, İshak, Ulaş) | Yazılım prototipi | REST API + SQLite + harita arayüzü + rota algoritması |
| **END** (Eılaf) | Süreç + literatür + matematiksel model | Rota optimizasyonu için amaç fonksiyonu, sürdürülebilirlik analizi |

EEM çıktısı yazılıma **REST API üzerinden** girdi olarak verilir; çıktıları END'in rota modeli besler. Detaylı entegrasyon §5'te.

---

## 2. Sistem Mimarisi

```
                           ┌──────────────────────────────┐
                           │  EEM: LTspice Transient      │
                           │  (0–10 sn, 0V → 5V ramp)     │
                           │  Draft2.txt                  │
                           └──────────────┬───────────────┘
                                          │ (B01 kutusuna)
                                          ▼
  ┌────────────────────┐         ┌─────────────────────┐         ┌──────────────────┐
  │ Random / step /    │  ─────► │  Flask REST API     │ ◄─────  │ Frontend         │
  │ demo simülasyon    │         │  (port 5001)        │         │ Leaflet + Vanilla│
  │ (8 kutu)           │         │                     │         │ JS               │
  └────────────────────┘         │  • /api/bins        │         │                  │
                                 │  • /api/simulate/*  │         │  • Harita        │
                                 │  • /api/electronics │         │  • Dashboard     │
                                 │  • /api/route       │         │  • Rota çizgisi  │
                                 │  • /api/reset       │         │  • Slider (EEM)  │
                                 └──────────┬──────────┘         └──────────────────┘
                                            │
                                            ▼
                                 ┌─────────────────────┐
                                 │  SQLite             │
                                 │  bins, measurements │
                                 └─────────────────────┘
```

**Veri akışı (tek bir simülasyon turu):**

```
1. Kullanıcı butona basar           →  POST /api/simulate/demo
2. Backend her kutu için            →  fill_level (0–100) üretir
3. Backend her ölçümü               →  measurements tablosuna yazar
4. Backend her kutunun mevcut       →  bins tablosunda günceller
   durumunu (normal/sarı/kırmızı)
5. Frontend periyodik fetch          →  GET /api/bins
6. Harita marker renkleri            →  status alanına göre değişir
7. Kullanıcı "Rota Göster"           →  GET /api/route?start_x=&start_y=
8. Backend Manhattan + en yakın      →  Toplanması gereken kutular için
   komşu ile rota hesaplar              sıralı rota döndürür
9. Frontend polyline çizer
```

---

## 3. Doluluk → Durum → Renk Eşikleri

Tüm sistem üç değer (`fill_level`, `voltage`, `alarm`, `status`) arasında basit bir dönüşüm üzerine kurulu:

| `fill_level` | `voltage` | `alarm` | `status` | Renk |
|---:|---:|---:|---|---|
| 0 – 49 | 0.00 – 2.45 V | 0 | `normal` | 🟢 Yeşil |
| 50 – 79 | 2.50 – 3.95 V | 1 | `needs_collection` | 🟡 Sarı |
| 80 – 100 | 4.00 – 5.00 V | 1 | `critical` | 🔴 Kırmızı |

**Formüller** (`backend/sensor_simulator.py:_build_data`):

```python
voltage    = fill_level / 100 * 5
alarm      = 1 if fill_level >= 50 else 0
status     = "critical"          if fill_level >= 80
             else "needs_collection" if fill_level >= 50
             else "normal"
```

**Eşik tek bir yerden geliyor:** %50 doluluk → 2.5V. Bu rakam keyfi değil; EEM ekibinin devre tasarımıyla birebir tutarlı (bkz. §5).

---

## 4. EEM Sinyali — Eşiği Nasıl Belirledik?

### 4.1 EEM tarafı (özet)

EEM ekibi LTspice ortamında bir **Op-Amp karşılaştırıcı (comparator) devresi** tasarladı. Devrenin çalışma prensibi:

- **Giriş:** Ultrasonik sensörün simüle edilmiş analog çıkışı. Doluluk arttıkça gerilim de artıyor (sensör tipiniz boş/dolu = düşük/yüksek voltaj).
- **Referans:** 10 kΩ + 10 kΩ gerilim bölücü ağ üzerinden **+5V supply'dan** türetilen **2.5V sabit referans**.
- **Çıkış:** Op-amp'ın iki girişini karşılaştırır:
  - Sensör voltajı < 2.5V → çıkış **0V** (alarm yok)
  - Sensör voltajı ≥ 2.5V → çıkış **5V** (alarm = dolu)

### 4.2 Neden 2.5V?

`5V supply / 2 = 2.5V` → tam ortayı işaret ediyor. **"Sensör tam ortayı (yani %50 doluluğu) geçince alarm üretsin"** ifadesinin elektriksel karşılığı bu. EEM 10 kΩ direnç çiftiyle bu noktayı kararlı şekilde üretiyor.

### 4.3 Yazılımda nasıl haritalanıyor?

Sensörün 0V–5V aralığı doğrudan 0%–100% doluluğa karşılık geliyor:

```
fill_level = round(voltage * 20)     # 5V → 100%
```

Bu çevirim sayesinde **EEM'in eşik geçişi (2.5V)** ile **bizim alarm eşiğimiz (fill_level ≥ 50)** birebir aynı noktada tetikleniyor. Disiplinler arası tutarlılık sıfır maliyetle sağlandı.

### 4.4 Draft2.txt nedir, nasıl kullanıyoruz?

`Draft2.txt` (repo'da `backend/data/electronics_signal.tsv` olarak da var), EEM'in LTspice transient analizinin **ham çıktısı**: 1201 satır tab-separated, her satır `<time> <voltage>` şeklinde. Sinyal 0 saniyede 0V'tan başlayıp 10 saniyede 5V'a lineer rampa şeklinde çıkıyor. **5. saniyede tam 2.5V**'a ulaşıyor — yani eşik geçişi tam burada.

```
time              V(n003)
0.000000000        0.000000
...
4.997245965        2.498623   ← eşiğin hemen altı (alarm yok)
5.000046965        2.500023   ← eşik geçişi! (alarm aktif)
...
10.000000000       5.000000
```

Bu sinyali yazılım tarafında **B01 kutusu (Mühendislik Fakültesi)** için "gerçek sensör" gibi kullanıyoruz. Diğer 7 kutu hâlâ random/step/demo simülasyonuyla çalışıyor — çünkü EEM ekibi 1 prototip yaptı, 8 değil. **Bu seçim bilinçli ve dürüst:** raporda "1 fiziksel sensör prototipi + 7 yazılım simülasyonu" diyoruz.

İşleyiş:

```
┌────────────────────────────────────────────────────────────────┐
│ backend/electronics_signal.py                                  │
│                                                                 │
│ 1. İlk istekte data/electronics_signal.tsv'yi belleğe yükler   │
│ 2. get_voltage_at(t) → herhangi bir t saniyesi için lineer    │
│    interpolasyonla voltaj döndürür                             │
│ 3. to_fill_level(v) → round(v * 20)                            │
└──────────────────────────┬─────────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────────┐
│ 3 REST endpoint                                                 │
│                                                                 │
│ GET  /api/electronics-signal?samples=N                         │
│      ─ yan etkisiz; frontend'in grafiği için seri              │
│ POST /api/electronics-signal/apply?bin_id=B01&t=5.0            │
│      ─ slider modu; o t anındaki değeri B01'e uygular          │
│ POST /api/simulate/electronics?bin_id=B01&samples=21           │
│      ─ bulk; tüm 0–10 sn serisini geçmişe yazar                │
└────────────────────────────────────────────────────────────────┘
```

**Demo'daki kullanımı:** İshak frontend'e 0–10 saniye sürgülü bir slider koyacak. Kullanıcı sürgüyü kaydırınca B01 kutusu yeşil → (5. saniyede) sarı → (8. saniyede) kırmızı dönüyor. Görsel kanıt: "**bizim REST API EEM'in gerçek LTspice çıkışını canlı tüketiyor**".

---

## 5. Klasör Yapısı

```
smart-waste-system/
├── backend/
│   ├── app.py                       # Flask uygulaması + tüm endpointler
│   ├── database.py                  # SQLite bağlantısı + sorgular
│   ├── seed_data.py                 # 8 kutu başlangıç verisi (idempotent)
│   ├── sensor_simulator.py          # Random / step / demo veri üretimi
│   ├── electronics_signal.py        # EEM LTspice sinyal okuyucu (§4)
│   ├── route_optimizer.py           # Manhattan + en yakın komşu
│   ├── data/
│   │   └── electronics_signal.tsv   # Draft2.txt'in kopyası (EEM çıktısı)
│   ├── requirements.txt
│   └── venv/                        # (gitignored)
│
├── frontend/
│   ├── index.html                   # Sayfa iskeleti
│   ├── style.css                    # Koyu tema, kartlar, marker stilleri
│   ├── script.js                    # Leaflet, fetch, animasyon
│   └── campus_map.png               # Kampüs arka plan (image overlay)
│
├── database/
│   └── waste.db                     # SQLite — runtime'da oluşur (gitignored)
│
└── docs/
    ├── README                       # (bu dosya)
    ├── TAKIM_GOREVLERI.md           # Canlı iş listesi (İshak / Ulaş)
    ├── api_documentation.md         # Tüm endpointler + örnek yanıtlar
    ├── bm_random_sensor_proje_plani.md  # Yüksek seviye proje planı
    ├── demo_scenario.md             # Sunum akışı + sunum metni
    └── report_notes.md              # Ara/final rapor için Türkçe metinler
```

---

## 6. Teknolojiler

| Katman | Seçim | Sebep |
|---|---|---|
| Backend framework | **Flask** | Hafif, route tanımları okunaklı, küçük ekip için yeterli |
| Veritabanı | **SQLite** | Sunucusuz, tek dosya, taşıması kolay |
| Frontend | **Vanilla JS + Leaflet** | Build adımı yok, demo öncesi karmaşa yok |
| Harita | **Leaflet (CRS.Simple)** | 2D kampüs planı için tile gerektirmiyor |
| CORS | **Flask-CORS** | Frontend `localhost:8000`, backend `127.0.0.1:5001` |
| Versiyon kontrol | **Git + GitHub** | PR akışı, branch isolation |

---

## 7. Kurulum

```bash
git clone https://github.com/semihbekdas/takimprojesi.git
cd takimprojesi/smart-waste-system/backend
python3 -m venv venv
source venv/bin/activate          # macOS / Linux
# Windows için: venv\Scripts\activate
pip install -r requirements.txt
```

---

## 8. Çalıştırma

**İki ayrı terminal aç.**

### Terminal 1 — Backend

```bash
cd smart-waste-system/backend
source venv/bin/activate
python3 app.py
# → http://127.0.0.1:5001
```

İlk çalıştırmada `smart-waste-system/database/waste.db` otomatik oluşturulur ve 8 kutu seed edilir. Sonraki çalıştırmalarda mevcut veriler korunur (seed idempotent).

### Terminal 2 — Frontend

```bash
cd smart-waste-system/frontend
python3 -m http.server 8000
# → http://localhost:8000
```

> `index.html`'i doğrudan açmayın — CORS ve `fetch` `file://` protokolünde bozulur. Statik server kullanın.

### Hızlı test

```bash
curl http://127.0.0.1:5001/api/health
# → {"status": "ok"}

curl -X POST http://127.0.0.1:5001/api/simulate/demo
# → 1 kritik + 2 sarı + 5 normal dağılım

curl -X POST "http://127.0.0.1:5001/api/electronics-signal/apply?t=5.0"
# → B01: fill=50, alarm=1, status=needs_collection (EEM eşik geçişi)
```

---

## 9. API Özeti

Tam endpoint listesi, örnek yanıtlar ve hata kodları için: [docs/api_documentation.md](docs/api_documentation.md).

| Kategori | Endpoint |
|---|---|
| **Genel** | `GET /api/health`, `/api/bins`, `/api/measurements`, `/api/dashboard`, `/api/collection-bins` |
| **Random simülasyon** | `POST /api/simulate/random`, `/api/simulate/step`, `/api/simulate/demo`, `/api/simulate/<bin_id>` |
| **EEM sinyali** | `GET /api/electronics-signal`, `POST /api/electronics-signal/apply`, `/api/simulate/electronics` |
| **Yönetim** | `POST /api/reset`, `/api/external-data` |
| **Rota** | `GET /api/route?start_x=&start_y=&start_name=` |
| **Worker (yakında)** | `/api/worker`, `/api/worker/collect/<bin_id>`, `/api/worker/reset` — Ulaş üzerinde çalışıyor |

---

## 10. Takım ve İş Bölümü

| Kişi | Sorumluluk | Durum |
|---|---|---|
| **Semih Bekdaş** (BM) | Backend, REST API, veritabanı, EEM sinyali entegrasyonu | ✅ Tamamlandı |
| **İshak Türk** (BM) | Frontend, harita, dashboard, EEM slider UI | ⏳ Aktif |
| **Ulaş Yalçın** (BM) | Yol ağı, rota algoritması, worker servisi, test | ⏳ Aktif |
| **Zeynep Baysal** (EEM) | Op-Amp karşılaştırıcı devresi | ✅ Sinyal teslim edildi |
| **Buse Hatice Merdamert** (EEM) | LTspice transient analiz | ✅ Sinyal teslim edildi |
| **Eılaf Kasem** (END) | Literatür, matematiksel model | ⏳ Aktif |

İshak ve Ulaş'ın ayrıntılı görev listesi (öncelik markerlı, haftalık plan dahil): [docs/TAKIM_GOREVLERI.md](docs/TAKIM_GOREVLERI.md).

---

## 11. Demo Senaryosu

Adım adım sunum akışı: [docs/demo_scenario.md](docs/demo_scenario.md).

**Kabul kriterleri** ([TAKIM_GOREVLERI.md §4](docs/TAKIM_GOREVLERI.md)):

1. Random/demo veri üretimi ile kutular anlık değişiyor.
2. Doluluğa göre yeşil/sarı/kırmızı renk doğru gösteriliyor.
3. Görevli araç en kısa rota üzerinden gidip toplama yapıyor.
4. Boşalan kutular sisteme kaydediliyor ve yeşile dönüyor.
5. Dashboard ve aktivite logu eşzamanlı güncelleniyor.
6. (Yeni) EEM slider B01'i eşik geçişinde sarıya/kırmızıya getiriyor.

---

## 12. Lisans / Notlar

Akademik proje — MDB308 dersi için. Kod açık kaynak, ancak rapor metinleri ve görselleri sadece ekip içi kullanım için.

> "Çalışan prototipte fiziksel sensör verisi yerine yazılım tabanlı random/mock sensör verisi kullanılmıştır. Üretilen mock veriler, gerçek sensörlerden gelebilecek `bin_id`, `fill_level`, `voltage`, `alarm` ve `timestamp` alanlarını temsil etmektedir. Ek olarak, EEM ekibinin Op-Amp karşılaştırıcı devresinin LTspice transient çıkışı da REST API üzerinden sisteme girdi olarak kabul edilmektedir; bu sayede yazılım yalnızca random veri ile değil, EEM'in gerçek devre çıktısıyla da uçtan uca test edilebilmektedir."
