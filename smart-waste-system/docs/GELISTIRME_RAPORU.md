# 📋 Akıllı Kampüs Atık Yönetim Sistemi — Geliştirme Planı

> **Son Güncelleme:** 2026-05-08  
> **Repo:** https://github.com/semihbekdas/takimprojesi  
> **Takım:** Semih · İshak · Ulaş

---

## 1. Proje Kapsamı

Sistem, yazılım içinde üretilen anlık/random sensör verileriyle çalışmaktadır.

**Temel akış:**
```
1. Backend random/anlık doluluk verisi üretir.
2. Kutu doluluk oranına göre yeşil / sarı / kırmızı olur.
3. Görevli araç, haritada mevcut konumundan hedef kutulara gider.
4. Görevli giderken en kısa yol çizgisi haritada görünür.
5. Kutuya varınca kutu boşaltılır ve yeşile döner.
6. Yeni veriler gelmeye devam eder.
```

---

## 2. Doluluk ve Durum Mantığı

| Doluluk | Durum | Renk |
|---:|---|---|
| 0–49% | `normal` | 🟢 Yeşil |
| 50–79% | `needs_collection` | 🟡 Sarı |
| 80–100% | `critical` | 🔴 Kırmızı |

```
voltage = fill_level / 100 × 5
alarm   = 1  (fill_level >= 50)
alarm   = 0  (fill_level < 50)
```

---

## 3. Görev Dağılımı

| Kişi | Sorumluluk |
|---|---|
| **Semih** | Backend API, veritabanı, simülasyon motoru |
| **İshak** | Frontend, harita, görselleştirme, animasyon |
| **Ulaş** | Yol ağı, rota algoritması, görevli servisi, test |

---

## 4. Semih — Backend

### ✅ Tamamlananlar

- Flask REST API (port 5001)
- SQLite veritabanı — `bins`, `measurements` tabloları
- 8 çöp kutusu başlangıç verisi ve kampüs koordinatları
- Random doluluk üretimi, voltaj / alarm / durum hesaplama
- `GET /api/health`, `GET /api/bins`, `GET /api/measurements`
- `POST /api/simulate`, `POST /api/simulate/<bin_id>`
- `GET /api/collection-bins`
- `GET /api/route?start_x=&start_y=`
- Manhattan mesafesi rota algoritması
- CORS yapılandırması

### 🔧 Yapılacaklar

- [ ] `POST /api/simulate/random` — tüm kutulara random doluluk
- [ ] `POST /api/simulate/step` — mevcut doluluğu azar azar artır
- [ ] `POST /api/simulate/demo` — demo için yeşil/sarı/kırmızı dağılım garanti et
- [ ] `POST /api/reset` — sistemi başlangıç durumuna getir
- [ ] `GET /api/dashboard` — özet istatistikler
- [ ] `GET /api/roads` — yol ağı node/edge bilgileri
- [ ] `GET /api/worker` — görevli durumu
- [ ] `POST /api/worker/collect/<bin_id>` — kutu toplandı işaretle
- [ ] `POST /api/worker/reset` — görevliyi depoya döndür
- [ ] Geçersiz `bin_id` için 404, aralık dışı `fill_level` için 400
- [ ] `sensor_simulator.py` içinde `random`, `step`, `demo` fonksiyonlarını ayır

---

## 5. İshak — Frontend ve Harita

### 🔧 Yapılacaklar

**Harita:**
- [ ] `L.imageOverlay` kaldır
- [ ] Kampüs sınırı, bina dikdörtgenleri ve bina etiketlerini Leaflet polygon/tooltip ile çiz
- [ ] Yol ağını `L.polyline` ile çiz
- [ ] Depo noktasını belirgin yap

**Kutu Markerları:**
- [ ] Yeşil / sarı / kırmızı marker tasarımı
- [ ] Kritik kutular için yanıp sönen veya halka efekti
- [ ] Popup içinde doluluk progress bar, voltaj, alarm, durum, son güncelleme

**Dashboard:**
- [ ] Toplam / normal / toplanmalı / kritik kutu kartları
- [ ] Görevli durum ve aktif hedef kartı
- [ ] Toplanan kutu sayacı, rota mesafesi

**Butonlar:**
- [ ] Random Veri Üret, Demo Verisi Üret
- [ ] Canlı Simülasyonu Başlat / Durdur
- [ ] Rota Hesapla, Görevliyi Gönder, Sistemi Sıfırla

**Görevli Görselleştirme:**
- [ ] Araç → hedef arası solid rota çizgisi
- [ ] Kalan tüm rota için kesik çizgi
- [ ] Araç toplama yaparken kısa animasyon

---

## 6. Ulaş — Yol Ağı, Görevli Servisi ve Test

### 🔧 Yapılacaklar

**Yol Ağı (`road_network.py`):**
- [ ] Node listesi ve edge listesi tanımla
- [ ] Her kutunun en yakın yol node'unu ata
- [ ] Frontend ile koordinatları senkronize et

**Rota Algoritması:**
- [ ] Yol ağı üzerinden rota hesaplama
- [ ] Kırmızı kutulara sarı kutulardan önce öncelik ver
- [ ] Görevlinin mevcut konumundan başlayan rota
- [ ] Rota çıktısında `path_coordinates` döndür

**Görevli Servisi (`worker_service.py`):**
- [ ] Görevli konumunu takip et
- [ ] Görevli aktifken çakışan butonları disable yap
- [ ] Kutuya varınca backend'e toplama isteği gönder, kutuyu %0–10 resetle
- [ ] Hedef kalmayınca görevliyi depoya döndür

**Test (`test_api.py`):**
- [ ] `/api/health`, `/api/bins`, `/api/simulate/random`, `/api/route`, `/api/reset` testleri
- [ ] Demo senaryosu ve görevli çakışma testi
- [ ] Chrome / Firefox / Safari görünüm testi

---

## 7. Haftalık Plan

| Hafta | Semih | İshak | Ulaş |
|---|---|---|---|
| 1 | Yeni simülasyon endpointleri | Harita ve dashboard iskeleti | Yol ağı tasarımı |
| 2 | Dashboard / reset / worker endpointleri | Marker, popup, doluluk barları | Rota ve `path_coordinates` çıktısı |
| 3 | API dokümantasyonu, README | Görevli animasyonu, rota çizgisi | Worker service ve entegrasyon |
| 4 | Hata düzeltme | Arayüz iyileştirme | Test senaryoları ve demo hazırlığı |
| Final | — | Demo ekranı hazır | Test ve demo akışı tamamlandı |

---

## 8. Minimum Demo Kriterleri

- [ ] Backend çalışıyor
- [ ] Frontend açılıyor
- [ ] Random / demo veri üretilebiliyor
- [ ] Kutular yeşil / sarı / kırmızı oluyor
- [ ] Haritada yollar görünüyor
- [ ] Görevli araç haritada görünüyor
- [ ] Rota görevlinin mevcut konumundan hesaplanıyor
- [ ] En kısa yol çizgisi görünüyor
- [ ] Görevli rota üzerinde hareket ediyor
- [ ] Kutuya varınca kutu boşalıyor ve yeşile dönüyor
- [ ] Dashboard güncelleniyor

---

## 9. Bilinen Hatalar

| # | Hata | Sorumlu | Çözüm |
|---|---|---|---|
| H1 | Harita markerları bazen güncellenmiyor | İshak | Marker refresh ve cache kontrolü |
| H2 | `step.name` rota panelinde undefined | Semih | API rota çıktısına `name` alanı ekle |
| H3 | Görevli aktifken simülasyon çakışıyor | Ulaş | Worker state ve buton disable mantığı |
| H4 | Rota çizgisi simülasyon sonrası silinmiyor | İshak | Yeni rota öncesi eski `routeLayer` temizle |
| H5 | Araç düz çizgiyle gidiyor | Ulaş + İshak | `path_coordinates` + frontend polyline |
| H6 | Tarayıcı cache eski `script.js` kullanıyor | İshak | Cache buster versiyon parametresi |

---

## 10. API Özeti

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/health` | Sunucu sağlık kontrolü |
| GET | `/api/bins` | Tüm kutu durumları |
| GET | `/api/measurements` | Ölçüm geçmişi |
| GET | `/api/dashboard` | Özet istatistikler |
| GET | `/api/roads` | Yol ağı node ve edge bilgileri |
| POST | `/api/simulate/random` | Tüm kutulara random doluluk |
| POST | `/api/simulate/step` | Bazı kutuların doluluğunu artır |
| POST | `/api/simulate/demo` | Demo için dağılım üret |
| POST | `/api/reset` | Sistemi sıfırla |
| GET | `/api/collection-bins` | Toplanması gereken kutular |
| GET | `/api/route/worker` | Görevli konumundan rota hesapla |
| GET | `/api/worker` | Görevli durumu |
| POST | `/api/worker/collect/<bin_id>` | Kutu toplandı işaretle |
| POST | `/api/worker/reset` | Görevliyi depoya döndür |

---

## 11. Çalıştırma

```bash
# Backend
cd smart-waste-system/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
# → http://127.0.0.1:5001

# Frontend
cd smart-waste-system/frontend
python3 -m http.server 8000
# → http://localhost:8000
```
