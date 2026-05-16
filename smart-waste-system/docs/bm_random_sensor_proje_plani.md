# Akıllı Kampüs Atık Yönetim ve Takip Sistemi
## BM Ekibi — Yazılım Geliştirme Planı

> **Son güncelleme:** 2026-05-16
> **Bu dosya** = projenin yüksek seviye planı.
> **Canlı iş listesi** için [TAKIM_GOREVLERI.md](TAKIM_GOREVLERI.md)'ye,
> **kullanım kılavuzu** için [../README.md](../README.md)'ye,
> **endpoint detayları** için [api_documentation.md](api_documentation.md)'a bak.

---

## 1. Kapsam

3 disiplinli proje (BM/EEM/END) içinde **BM ekibinin sorumluluğu** çalışan bir yazılım prototipi geliştirmek. Plan şu şekilde evrildi:

| Tarih | Durum |
|---|---|
| İlk plan | Elektronik gerçek sensör verisi sağlayacak |
| Revizyon 1 | EEM sadece görsel destek — sistem yazılım random verisiyle çalışacak |
| Revizyon 2 (güncel) | EEM bir LTspice prototipi teslim etti (`Draft2.txt`) — bu **B01 kutusuna** REST API üzerinden bağlandı, diğer 7 kutu hâlâ random/step/demo |

**Sistem akışı:**

```
Random simülasyon (7 kutu) ┐
                            ├─►  Flask REST API  ─►  SQLite  ─►  Frontend (harita + rota)
EEM LTspice sinyali (B01)  ┘
```

---

## 2. Doluluk → Durum Mantığı

| `fill_level` | `voltage` | `alarm` | `status` | Renk |
|---:|---:|---:|---|---|
| 0 – 49 | 0.00 – 2.45 V | 0 | `normal` | 🟢 |
| 50 – 79 | 2.50 – 3.95 V | 1 | `needs_collection` | 🟡 |
| 80 – 100 | 4.00 – 5.00 V | 1 | `critical` | 🔴 |

`voltage = fill_level / 100 * 5`. EEM'in 2.5V karşılaştırıcı eşiği = bizim %50 alarm eşiğimiz; tek dönüşüm formülüyle disiplinler arası tutarlılık sağlanıyor (detay: [../README.md §4](../README.md)).

---

## 3. Görev Dağılımı (güncel)

| Kişi | Sorumluluk | Durum |
|---|---|---|
| **Semih** | Backend, REST API, SQLite, sensor simulator, EEM sinyali entegrasyonu, API dokümantasyonu | ✅ Tamamlandı |
| **İshak** | Frontend (HTML/CSS/JS), Leaflet harita, dashboard, marker animasyonları, EEM slider UI | ⏳ Aktif (P0 görevleri TAKIM_GOREVLERI'da) |
| **Ulaş** | `road_network.py`, gerçek yol takipli rota algoritması, `worker_service.py`, `test_api.py` | ⏳ Aktif (P0 worker_service) |

> Önceki planda Semih sadece backend/API, İshak DB, Ulaş frontend idi. Yeniden bölüştürüldü: Semih DB'yi de aldı (zaten kuruluydu), İshak frontend'e geçti, Ulaş routing ve worker'a odaklandı.

---

## 4. Klasör Yapısı

```
smart-waste-system/
├── backend/
│   ├── app.py                       # Flask app, tüm endpointler
│   ├── database.py                  # SQLite bağlantı + sorgular
│   ├── sensor_simulator.py          # random / step / demo üretim
│   ├── electronics_signal.py        # EEM LTspice okuyucu  (yeni)
│   ├── route_optimizer.py           # Manhattan + en yakın komşu
│   ├── seed_data.py                 # 8 kutu başlangıç (idempotent)
│   ├── data/electronics_signal.tsv  # Draft2.txt kopyası   (yeni)
│   └── requirements.txt
├── frontend/
│   ├── index.html, style.css, script.js
│   └── campus_map.png
├── database/waste.db                # runtime, gitignored
└── docs/                            # bu dosya + diğerleri
```

---

## 5. Adım Adım Uygulama — Durum Çizelgesi

| # | Adım | Sorumlu | Durum |
|---|---|---|---|
| 1 | Ortak kararlar (kutu sayısı, eşikler, formatlar) | Hepsi | ✅ |
| 2 | 8 kutu seed verisi + koordinatlar | Semih | ✅ |
| 3 | SQLite tablo tasarımı (`bins`, `measurements`) | Semih | ✅ |
| 4 | Random sensor simülasyonu | Semih | ✅ |
| 5 | Backend REST API (13 endpoint) | Semih | ✅ |
| 6 | Step + demo simülasyon modları | Semih | ✅ |
| 7 | Validation (404 / 400) | Semih | ✅ |
| 8 | EEM LTspice sinyal entegrasyonu | Semih | ✅ |
| 9 | API dokümantasyonu | Semih | ✅ |
| 10 | Frontend HTML/JS uyumsuzluk düzeltmesi | İshak | ⏳ P0 |
| 11 | Demo butonları (random / step / demo / reset) | İshak | ⏳ P0 |
| 12 | EEM slider UI (B01 için 0–10 sn) | İshak | ⏳ P1 |
| 13 | Dashboard kartları, marker iyileştirmeleri | İshak | ⏳ P1 |
| 14 | `worker_service.py` (görevli durum makinesi) | Ulaş | ⏳ P0 |
| 15 | `road_network.py` (yol ağı) | Ulaş | ⏳ P1 |
| 16 | Yol takipli rota algoritması (`path_coordinates`) | Ulaş | ⏳ P1 |
| 17 | Worker/roads endpoint sarmalayıcıları | Ulaş + Semih | ⏳ P1 |
| 18 | `test_api.py` | Ulaş | ⏳ P2 |
| 19 | Tarayıcı uyumluluğu testi | İshak | ⏳ P2 |
| 20 | Demo provası + ekran görüntüleri | Hepsi | ⏳ |

Ayrıntılı görev parçalanması, P0/P1/P2 öncelikleri, haftalık plan ve bilinen hatalar için: **[TAKIM_GOREVLERI.md](TAKIM_GOREVLERI.md)**.

---

## 6. Minimum Demo Kriterleri

- [x] Backend ayağa kalkıyor (`python3 app.py`)
- [x] 8 kutu seed ediliyor (`/api/bins`)
- [x] Random veri üretiliyor (`/api/simulate/random`)
- [x] Demo dağılımı garanti (`/api/simulate/demo` → 1 kritik + 2 sarı + 5 normal)
- [x] EEM sinyali B01'e uygulanabiliyor (`/api/electronics-signal/apply?t=5.0` → fill=50, alarm=1)
- [x] Manhattan rota döndürülüyor (`/api/route`)
- [x] Reset çalışıyor (`/api/reset`)
- [ ] Frontend açılıyor ve butonlar tepki veriyor (İshak P0)
- [ ] Marker'lar yeşil/sarı/kırmızı dönüyor (İshak P0)
- [ ] Görevli araç haritada hareket ediyor (İshak + Ulaş)
- [ ] Kutuya varınca boşalıyor (`/api/external-data` ile bağlı, çalışıyor)
- [ ] Rota gerçek yolu takip ediyor (Ulaş P1)

---

## 7. Kabul Kriterleri

`docs/TAKIM_GOREVLERI.md §4`'teki demo kabul kriterleri kanonik:

1. Random/demo veri üretimi ile kutuların anlık doluluk verisi değişiyor.
2. Çöp kutuları doluluğa göre yeşil/sarı/kırmızı olarak haritada güncelleniyor.
3. Görevli araç hedef kutulara en kısa rota üzerinden gidiyor ve toplama yapıyor.
4. Toplanan kutuların boşaltıldığı sisteme kaydediliyor ve yeşile dönüyor.
5. Dashboard ve aktivite logu olaylarla eşzamanlı güncelleniyor.

EEM entegrasyonu için ek kriter:

6. EEM slider B01'i 0–5 sn arası yeşil, 5–8 sn arası sarı, 8–10 sn arası kırmızı yapıyor (rapor için en güçlü görsel kanıt).

---

## 8. Riskler ve Önlemler

| Risk | Çözüm |
|---|---|
| EEM 8 kutu için sensör vermiyor | ✅ B01'e EEM, diğerleri yazılım simülasyonu — raporda dürüstçe belirtildi |
| Frontend-API uyumsuzluğu | ⏳ TAKIM_GOREVLERI §2.1 (İshak P0) |
| Rota düz çizgi gidiyor | ⏳ TAKIM_GOREVLERI §3.2 (Ulaş P1, `path_coordinates`) |
| Tarayıcı eski JS cache'liyor | ⏳ `index.html` içindeki `?v=N` artırma kuralı |
| DB iki ayrı yerden okunuyor | ✅ Düzeltildi — herkes `database.get_db_connection()` kullanmalı |
| Demo gününde rastgele veri istenmeyen dağılım üretir | ✅ `/api/simulate/demo` garanti dağılım sağlar |

---

## 9. Git / GitHub Çalışma Düzeni

**Branch düzeni:**

```
main                  ← stabil, demo edilebilir
backend-semih         ← Semih backend değişiklikleri
frontend-ishak        ← İshak frontend
routing-ulas          ← Ulaş yol/worker/test
```

**Kurallar:**

1. Herkes kendi branch'inde çalışır.
2. PR aç → en az bir kişi review → main'e merge.
3. Çalışmayan kod main'e merge edilmez.
4. README ve docs/ güncellenmeden büyük değişiklik merge edilmez.
5. Yıkıcı git komutlarından (`push --force`, `reset --hard`) kaçının.

**Commit mesaj formatı (öneri):**

```
backend: ...           # backend değişiklikleri
frontend: ...          # frontend değişiklikleri
docs: ...              # doküman güncellemesi
fix: ...               # bug fix
feat(eem): ...         # EEM ile ilgili
```

---

## 10. Rapor İçin Kısa Sonuç

> Geliştirilen yazılım prototipi, fiziksel sensör verisi bulunmadığı durumda dahi random/mock sensör verileri üzerinden sistemin temel işlevlerini test edebilecek şekilde tasarlanmıştır. Bunun yanı sıra, EEM ekibinin LTspice ortamında geliştirdiği Op-Amp karşılaştırıcı devresinin transient analiz çıkışı, REST API üzerinden B01 numaralı çöp kutusuna girdi olarak bağlanmıştır. Bu sayede sistem, donanımdan bağımsız simülasyon modunun yanı sıra, EEM disiplininin somut bir tasarım çıktısıyla da uçtan uca doğrulanabilmiştir. Veri üretimi, REST API, SQLite veritabanı, harita tabanlı görselleştirme ve Manhattan mesafesi temelli rota hesaplama modülleri entegre edilerek çalışan bir karar destek prototipi oluşturulmuştur.

---

## 11. İlgili Dosyalar

- [../README.md](../README.md) — kullanıcı kılavuzu, mimari, EEM açıklaması
- [TAKIM_GOREVLERI.md](TAKIM_GOREVLERI.md) — canlı iş listesi, öncelikler, haftalık plan
- [api_documentation.md](api_documentation.md) — tüm endpointler ve örnek yanıtlar
- [demo_scenario.md](demo_scenario.md) — sunum akışı
- [report_notes.md](report_notes.md) — ara/final rapor metinleri
