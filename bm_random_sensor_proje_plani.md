# Akıllı Kampüs Atık Yönetim ve Takip Sistemi  
## 3 Bilgisayarcı İçin Detaylı Yazılım Geliştirme Planı

> Bu plan, elektronik ekibinden çalışan sensör verisi gelmeyeceği varsayımıyla hazırlanmıştır.  
> Sistem, gerçek sensör yerine yazılım içinde üretilen random/mock sensör verileriyle çalışacaktır.  
> Amaç: REST API, veritabanı, harita arayüzü ve rota hesaplama modüllerinden oluşan çalışan bir yazılım prototipi geliştirmek.

---

## 1. Projenin Yeni Kapsamı

Önceki planda elektronik ekipten sensör/simülasyon çıktısı gelmesi bekleniyordu. Ancak yeni durumda elektronik taraf yalnızca görsel destek sağlayacak ve çalışan yazılım sistemine doğrudan veri sağlamayacak.

Bu yüzden proje şu şekilde konumlandırılmalıdır:

```text
Random/mock sensör verisi üretimi
        ↓
REST API
        ↓
SQLite veritabanı
        ↓
Durum ve alarm hesaplama
        ↓
Web arayüzü / harita
        ↓
Rota hesaplama ve gösterimi
```

Bu yaklaşımda sistemin ana çalışan kısmı 3 bilgisayar mühendisliği öğrencisi tarafından geliştirilecektir.

---

## 2. Ana Hedef

Bu projenin yazılım tarafındaki hedefi şudur:

```text
Kampüste bulunan çöp kutuları için random doluluk verileri üretmek,
bu verileri API üzerinden sisteme almak,
veritabanına kaydetmek,
doluluk durumunu yeşil/sarı/kırmızı olarak belirlemek,
harita üzerinde göstermek
ve toplanması gereken kutular için rota önermek.
```

---

## 3. Kullanılacak Teknolojiler

| Alan | Teknoloji | Açıklama |
|---|---|---|
| Backend | Python Flask veya FastAPI | API endpointleri için |
| Veritabanı | SQLite | Hafif ve kolay kurulumlu DB |
| Frontend | HTML, CSS, JavaScript | Arayüz için |
| Harita | Leaflet.js | 2D kampüs/harita görselleştirme |
| Veri üretimi | Python random modülü | Sensör verisini taklit etmek için |
| Test | Postman, cURL, tarayıcı konsolu | API ve sistem testi için |
| Versiyon kontrol | Git/GitHub | Ortak çalışma için |

---

## 4. Üç Bilgisayarcı İçin Ana Görev Dağılımı

| Kişi | Ana Sorumluluk | Alt Sorumluluklar | Teslim Edeceği Çıktı |
|---|---|---|---|
| Semih | Backend, API, random veri üretimi | Flask/FastAPI kurulumu, endpointler, mock veri üretimi, API testleri | Çalışan backend, endpoint dokümantasyonu, Postman/cURL testleri |
| İshak | Veritabanı ve durum mantığı | SQLite tabloları, veri kayıt/güncelleme, durum belirleme, geçmiş ölçümler | DB dosyası, tablo şeması, durum fonksiyonları, test kayıtları |
| Ulaş | Frontend, harita, rota gösterimi | Web arayüzü, Leaflet harita, marker renkleri, rota çizimi | Çalışan web ekranı, kutu popup'ları, rota görseli |

---

## 5. İş Bölümünün Mantığı

Bu dağılımda sistem üç temel parçaya ayrılır:

```text
Semih → Veri sisteme nasıl giriyor?
İshak → Veri nasıl saklanıyor ve anlamlandırılıyor?
Ulaş → Veri kullanıcıya nasıl gösteriliyor?
```

Bu nedenle iş yükü dengelidir. Bir kişi sadece küçük bir ekran veya küçük bir fonksiyon yapmamış olur; herkes sistemin ana bir parçasını sahiplenir.

---

## 6. Önerilen Proje Dosya Yapısı

Projeyi şu klasör yapısıyla kurmak uygundur:

```text
smart-waste-system/
│
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── models.py
│   ├── sensor_simulator.py
│   ├── route_optimizer.py
│   ├── seed_data.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── database/
│   └── waste.db
│
├── docs/
│   ├── api_documentation.md
│   ├── test_plan.md
│   └── report_notes.md
│
└── README.md
```

---

## 7. Dosya Sahipliği

| Dosya | Ana Sorumlu | Yardımcı |
|---|---|---|
| `backend/app.py` | Semih | İshak |
| `backend/sensor_simulator.py` | Semih | İshak |
| `backend/database.py` | İshak | Semih |
| `backend/models.py` | İshak | Semih |
| `backend/seed_data.py` | İshak | Semih |
| `backend/route_optimizer.py` | Ulaş | Semih |
| `frontend/index.html` | Ulaş | - |
| `frontend/style.css` | Ulaş | - |
| `frontend/script.js` | Ulaş | Semih |
| `docs/api_documentation.md` | Semih | - |
| `docs/test_plan.md` | İshak | Semih, Ulaş |
| `docs/report_notes.md` | Herkes | Herkes |
| `README.md` | Herkes | Herkes |

---

# 8. Adım Adım Uygulama Planı

---

## Adım 1: Ortak Kararların Netleştirilmesi

### Amaç

Herkes kod yazmaya başlamadan önce sistemde hangi verilerin olacağı, kaç çöp kutusu kullanılacağı ve doluluk durumlarının nasıl sınıflandırılacağı belirlenmelidir.

### Kararlar

| Karar | Önerilen Değer |
|---|---|
| Çöp kutusu sayısı | 8 veya 10 |
| Doluluk aralığı | 0–100 |
| Voltaj aralığı | 0–5V |
| Alarm eşiği | %50 ve üzeri |
| Kritik eşik | %80 ve üzeri |
| Normal renk | Yeşil |
| Toplanmalı renk | Sarı |
| Kritik renk | Kırmızı |
| Rota algoritması | Manhattan mesafesi + en yakın komşu |
| Veritabanı | SQLite |
| Harita | Leaflet.js veya basit 2D koordinat planı |

### Bu adımda yapılacaklar

- Semih backend teknolojisini kesinleştirir.
- İshak veritabanı alanlarını kesinleştirir.
- Ulaş haritada kaç kutu ve hangi konumların gösterileceğini belirler.
- Herkes aynı veri formatında anlaşır.

### Çıktı

`docs/report_notes.md` içine şu açıklama yazılır:

```text
Çalışan prototipte fiziksel sensör verisi yerine yazılım tabanlı random/mock sensör verisi kullanılmıştır. Bu veri gerçek sensörlerden gelebilecek bin_id, fill_level, voltage, alarm ve timestamp alanlarını temsil etmektedir.
```

---

## Adım 2: Kutu Listesinin Oluşturulması

### Sorumlu

İshak ana sorumlu, Ulaş destek.

### Amaç

Sistemde gösterilecek çöp kutuları önceden tanımlanmalıdır.

### Örnek kutu verisi

| bin_id | name | x | y | location |
|---|---|---:|---:|---|
| B01 | Mühendislik Girişi | 10 | 20 | Engineering Entrance |
| B02 | Kütüphane Önü | 25 | 35 | Library |
| B03 | Yemekhane | 40 | 15 | Cafeteria |
| B04 | Spor Salonu | 55 | 45 | Sports Hall |
| B05 | Öğrenci Merkezi | 70 | 30 | Student Center |
| B06 | Otopark | 80 | 60 | Parking |
| B07 | Laboratuvar Bloğu | 35 | 70 | Lab Block |
| B08 | Kampüs Kapısı | 5 | 50 | Main Gate |

### Yapılacaklar

1. `bins` tablosuna bu kutular başlangıç verisi olarak eklenecek.
2. Her kutuya `x` ve `y` koordinatı verilecek.
3. Ulaş bu koordinatları harita üzerinde marker olarak kullanacak.
4. İshak bu verileri `seed_data.py` ile veritabanına yükleyecek.

### Teslim

- `seed_data.py`
- Başlangıç kutu listesi
- Veritabanında dolu `bins` tablosu

---

## Adım 3: Veritabanı Tasarımı

### Sorumlu

İshak

### Amaç

Random üretilen sensör verilerinin saklanacağı SQLite yapısını kurmak.

### Tablo 1: `bins`

Bu tablo çöp kutularının sabit bilgilerini ve güncel durumunu tutar.

```sql
CREATE TABLE bins (
    bin_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    location TEXT,
    current_fill_level INTEGER DEFAULT 0,
    current_voltage REAL DEFAULT 0,
    current_alarm INTEGER DEFAULT 0,
    current_status TEXT DEFAULT 'normal',
    last_updated TEXT
);
```

### Tablo 2: `measurements`

Bu tablo her ölçümü geçmiş kayıt olarak tutar.

```sql
CREATE TABLE measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bin_id TEXT NOT NULL,
    fill_level INTEGER NOT NULL,
    voltage REAL NOT NULL,
    alarm INTEGER NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (bin_id) REFERENCES bins(bin_id)
);
```

### Durum mantığı

| Doluluk | Alarm | Status | Renk |
|---:|---:|---|---|
| 0–49 | 0 | normal | green |
| 50–79 | 1 | needs_collection | yellow |
| 80–100 | 1 | critical | red |

### Yapılacaklar

1. `database.py` dosyası oluşturulur.
2. SQLite bağlantı fonksiyonu yazılır.
3. Tablo oluşturma fonksiyonu yazılır.
4. Veri ekleme fonksiyonu yazılır.
5. Güncel kutu durumunu güncelleyen fonksiyon yazılır.
6. Ölçüm geçmişi ekleyen fonksiyon yazılır.
7. Tüm kutuları listeleyen fonksiyon yazılır.
8. Toplanması gereken kutuları döndüren fonksiyon yazılır.

### İshak’ın yazacağı temel fonksiyonlar

```python
def init_db():
    pass

def insert_initial_bins():
    pass

def save_measurement(data):
    pass

def update_bin_status(data):
    pass

def get_all_bins():
    pass

def get_measurements():
    pass

def get_bins_for_collection():
    pass
```

### Teslim

- `database.py`
- `models.py`
- `waste.db`
- Test edilmiş tablo yapısı

---

## Adım 4: Random Sensör Verisi Üretimi

### Sorumlu

Semih

### Amaç

Gerçek sensör olmadığı için sistemin çalışması adına yapay sensör verisi üretmek.

### Üretilecek veri alanları

| Alan | Açıklama |
|---|---|
| `bin_id` | Hangi çöp kutusu |
| `fill_level` | Doluluk yüzdesi, 0–100 |
| `voltage` | Doluluğa karşılık gelen voltaj, 0–5V |
| `alarm` | Doluluk %50 ve üzeriyse 1 |
| `status` | normal / needs_collection / critical |
| `timestamp` | Veri üretim zamanı |

### Veri üretim formülleri

```text
fill_level = random 0–100
voltage = fill_level / 100 * 5
alarm = 1 if fill_level >= 50 else 0
```

### Status belirleme

```text
0–49   → normal
50–79  → needs_collection
80–100 → critical
```

### Örnek Python fonksiyonu

```python
import random
from datetime import datetime

def calculate_status(fill_level):
    if fill_level >= 80:
        return "critical"
    elif fill_level >= 50:
        return "needs_collection"
    return "normal"

def generate_sensor_data(bin_id):
    fill_level = random.randint(0, 100)
    voltage = round((fill_level / 100) * 5, 2)
    alarm = 1 if fill_level >= 50 else 0
    status = calculate_status(fill_level)

    return {
        "bin_id": bin_id,
        "fill_level": fill_level,
        "voltage": voltage,
        "alarm": alarm,
        "status": status,
        "timestamp": datetime.now().isoformat(timespec="seconds")
    }
```

### Yapılacaklar

1. `sensor_simulator.py` dosyası oluşturulur.
2. Tek kutu için random veri üreten fonksiyon yazılır.
3. Tüm kutular için random veri üreten fonksiyon yazılır.
4. `fill_level`, `voltage`, `alarm`, `status` uyumu test edilir.
5. Üretilen veri API’ye bağlanır.

### Teslim

- `sensor_simulator.py`
- Örnek JSON çıktıları
- Random veri test ekran görüntüsü

---

## Adım 5: Backend API Kurulumu

### Sorumlu

Semih

### Amaç

Frontend, veritabanı ve random veri üreticiyi birbirine bağlayan API katmanını oluşturmak.

### Minimum endpoint listesi

| Method | Endpoint | Açıklama | Sorumlu |
|---|---|---|---|
| GET | `/api/health` | Backend çalışıyor mu kontrolü | Semih |
| GET | `/api/bins` | Tüm kutuları döndürür | Semih + İshak |
| GET | `/api/measurements` | Ölçüm geçmişini döndürür | Semih + İshak |
| POST | `/api/simulate` | Tüm kutular için random veri üretir ve DB’ye kaydeder | Semih + İshak |
| POST | `/api/simulate/<bin_id>` | Tek kutu için random veri üretir | Semih |
| GET | `/api/collection-bins` | Toplanması gereken kutuları döndürür | İshak |
| GET | `/api/route` | Rota sonucunu döndürür | Ulaş + Semih |

### Örnek API response: `/api/bins`

```json
[
  {
    "bin_id": "B01",
    "name": "Mühendislik Girişi",
    "x": 10,
    "y": 20,
    "current_fill_level": 74,
    "current_voltage": 3.7,
    "current_alarm": 1,
    "current_status": "needs_collection",
    "last_updated": "2026-05-06T15:20:00"
  }
]
```

### Örnek API response: `/api/route`

```json
{
  "start": {
    "x": 0,
    "y": 0,
    "name": "Depo"
  },
  "route": [
    {
      "bin_id": "B03",
      "x": 40,
      "y": 15,
      "fill_level": 82,
      "status": "critical"
    },
    {
      "bin_id": "B05",
      "x": 70,
      "y": 30,
      "fill_level": 65,
      "status": "needs_collection"
    }
  ],
  "total_distance": 115
}
```

### Yapılacaklar

1. Flask/FastAPI projesi başlatılır.
2. `requirements.txt` oluşturulur.
3. `/api/health` endpointi yazılır.
4. DB bağlantısı test edilir.
5. `/api/bins` endpointi yazılır.
6. `/api/simulate` endpointi yazılır.
7. `/api/route` endpointi yazılır.
8. CORS gerekiyorsa açılır.
9. Postman/cURL ile test edilir.

### Teslim

- `app.py`
- Çalışan API
- API test ekran görüntüleri
- `docs/api_documentation.md`

---

## Adım 6: Rota Hesaplama Algoritması

### Sorumlu

Ulaş ana sorumlu, Semih destek.

### Amaç

Doluluk oranı %50 ve üzeri olan kutular için toplama rotası oluşturmak.

### Kullanılacak yöntem

Basit ve anlaşılır olması için:

```text
Manhattan mesafesi + en yakın komşu yaklaşımı
```

### Manhattan mesafesi

```text
d(A, B) = |x1 - x2| + |y1 - y2|
```

### Rota algoritması

```text
1. Başlangıç noktası depo olarak kabul edilir.
2. Veritabanından fill_level >= 50 olan kutular alınır.
3. Mevcut konuma en yakın kutu bulunur.
4. Bu kutu rotaya eklenir.
5. Mevcut konum bu kutunun konumu olur.
6. Kutu listeden çıkarılır.
7. Tüm kutular bitene kadar işlem devam eder.
8. Toplam mesafe hesaplanır.
```

### Örnek Python fonksiyonları

```python
def manhattan_distance(a, b):
    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])

def calculate_route(bins, start={"x": 0, "y": 0, "name": "Depo"}):
    remaining = bins.copy()
    current = start
    route = []
    total_distance = 0

    while remaining:
        nearest = min(remaining, key=lambda b: manhattan_distance(current, b))
        distance = manhattan_distance(current, nearest)
        total_distance += distance
        route.append(nearest)
        current = nearest
        remaining.remove(nearest)

    return {
        "start": start,
        "route": route,
        "total_distance": total_distance
    }
```

### Yapılacaklar

1. `route_optimizer.py` dosyası oluşturulur.
2. Manhattan mesafesi fonksiyonu yazılır.
3. En yakın komşu algoritması yazılır.
4. Boş rota durumu kontrol edilir.
5. Tek kutu durumu test edilir.
6. Birden fazla kutu durumu test edilir.
7. API’ye bağlanır.
8. Frontend’e rota verisi gönderilir.

### Teslim

- `route_optimizer.py`
- `/api/route` çıktısı
- Örnek rota sonucu
- Harita üzerinde rota çizimi için uygun JSON

---

## Adım 7: Frontend ve Harita Arayüzü

### Sorumlu

Ulaş

### Amaç

Sistemi kullanıcıya görsel olarak sunmak.

### Arayüzde bulunması gereken bölümler

| Bölüm | Açıklama |
|---|---|
| Başlık | Akıllı Kampüs Atık Yönetim Sistemi |
| Özet kartları | Toplam kutu, normal kutu, toplanmalı kutu, kritik kutu |
| Harita | Kampüs planı ve kutu markerları |
| Simülasyon butonu | Random veri üretir |
| Rota butonu | Toplama rotasını hesaplar |
| Kutu detay popup | Doluluk, voltaj, alarm, durum |
| Ölçüm tablosu | Son ölçümler |
| Rota özeti | Toplanacak kutular ve toplam mesafe |

### Marker renkleri

| Status | Marker rengi |
|---|---|
| normal | Yeşil |
| needs_collection | Sarı |
| critical | Kırmızı |

### Popup içeriği

```text
Kutu: B03
Konum: Yemekhane
Doluluk: %84
Voltaj: 4.20V
Alarm: 1
Durum: Kritik
Son Güncelleme: 2026-05-06 15:20
```

### Yapılacaklar

1. `frontend/index.html` oluşturulur.
2. `frontend/style.css` oluşturulur.
3. `frontend/script.js` oluşturulur.
4. Leaflet.js CDN bağlantısı eklenir.
5. Harita başlatılır.
6. Backend’den `/api/bins` verisi çekilir.
7. Markerlar haritada gösterilir.
8. Marker renkleri status değerine göre ayarlanır.
9. Popup detayları eklenir.
10. “Simülasyon Çalıştır” butonu eklenir.
11. Butona basınca `/api/simulate` çağrılır.
12. Harita verisi yenilenir.
13. “Rota Hesapla” butonu eklenir.
14. `/api/route` çağrılır.
15. Rota çizgisi haritada gösterilir.
16. Toplam mesafe ekranda yazılır.

### Teslim

- Çalışan `index.html`
- Çalışan `style.css`
- Çalışan `script.js`
- Harita ekran görüntüsü
- Rota ekran görüntüsü

---

## Adım 8: Backend–Frontend Entegrasyonu

### Sorumlular

Semih + Ulaş

### Amaç

Frontend butonlarının backend API ile doğru çalışması.

### Entegrasyon akışı

```text
Kullanıcı Simülasyon Çalıştır butonuna basar
        ↓
Frontend POST /api/simulate çağırır
        ↓
Backend random veri üretir
        ↓
Backend DB’ye kaydeder
        ↓
Frontend GET /api/bins çağırır
        ↓
Harita markerları güncellenir
```

### Rota entegrasyon akışı

```text
Kullanıcı Rota Hesapla butonuna basar
        ↓
Frontend GET /api/route çağırır
        ↓
Backend dolu kutuları DB’den alır
        ↓
Rota algoritması çalışır
        ↓
Frontend rota çizgisini haritada gösterir
```

### Yapılacaklar

1. API URL’leri `script.js` içinde sabitlenir.
2. API çağrılarında hata kontrolü eklenir.
3. Simülasyon sonrası harita otomatik yenilenir.
4. Rota çizimi eski rota çizgisini temizler.
5. Boş rota varsa kullanıcıya “Toplanması gereken kutu yok” mesajı gösterilir.

### Teslim

- Çalışan tam entegrasyon
- API + frontend demo videosu veya ekran görüntüleri

---

## Adım 9: Test Planı

### Sorumlu

İshak ana sorumlu, herkes destek.

### Amaç

Sistemin uçtan uca doğru çalıştığını göstermek.

### Test 1: Backend çalışıyor mu?

| Test | Beklenen Sonuç |
|---|---|
| `GET /api/health` | `{"status": "ok"}` döner |

### Test 2: Kutu listesi geliyor mu?

| Test | Beklenen Sonuç |
|---|---|
| `GET /api/bins` | Tüm kutular JSON olarak döner |

### Test 3: Random veri üretiliyor mu?

| Test | Beklenen Sonuç |
|---|---|
| `POST /api/simulate` | Her kutu için yeni doluluk oluşur |

### Test 4: Veritabanına kayıt oluyor mu?

| Test | Beklenen Sonuç |
|---|---|
| Simülasyondan sonra `measurements` tablosu kontrol edilir | Yeni ölçümler görünür |

### Test 5: Durum mantığı doğru mu?

| Doluluk | Beklenen Status |
|---:|---|
| 20 | normal |
| 55 | needs_collection |
| 90 | critical |

### Test 6: Harita güncelleniyor mu?

| Test | Beklenen Sonuç |
|---|---|
| Simülasyon sonrası frontend yenilenir | Marker renkleri değişir |

### Test 7: Rota hesaplanıyor mu?

| Test | Beklenen Sonuç |
|---|---|
| Doluluk >= 50 olan kutular varsa | Rota JSON döner ve haritada çizilir |

### Test 8: Boş rota kontrolü

| Test | Beklenen Sonuç |
|---|---|
| Tüm kutular < 50 ise | “Toplanması gereken kutu yok” mesajı görünür |

### Teslim

- `docs/test_plan.md`
- Test ekran görüntüleri
- Hata varsa çözüm notu

---

## Adım 10: Demo Senaryosu

### Amaç

Hocaya veya sınıfa sistemi çalışır şekilde göstermek.

### Demo sırası

```text
1. Web arayüzü açılır.
2. Başlangıçta kutuların listesi ve harita gösterilir.
3. Simülasyon Çalıştır butonuna basılır.
4. Random doluluk verileri oluşur.
5. Kutular yeşil/sarı/kırmızı olarak güncellenir.
6. Bir kutuya tıklanarak popup detayları gösterilir.
7. Rota Hesapla butonuna basılır.
8. Dolu/kritik kutular için rota çizilir.
9. Toplam mesafe gösterilir.
10. Ölçüm geçmişi veya son ölçümler gösterilir.
```

### Demo sırasında söylenecek kısa açıklama

```text
Bu prototipte fiziksel sensör verisi yerine yazılım tabanlı random sensör verisi üretilmektedir. Üretilen veriler gerçek sensörlerden gelecek bin_id, fill_level, voltage, alarm ve timestamp alanlarını temsil eder. Backend bu verileri API üzerinden işler, SQLite veritabanına kaydeder, frontend ise kutuları doluluk durumuna göre harita üzerinde gösterir. Doluluk oranı %50 ve üzerindeki kutular toplama listesine alınır ve Manhattan mesafesi temelli en yakın komşu yaklaşımıyla rota hesaplanır.
```

---

## Adım 11: Rapor İçin Yazılacak Metinler

### Yazılım prototipi açıklaması

```text
Projenin çalışan yazılım prototipinde fiziksel sensör verisi yerine yazılım tabanlı random/mock sensör verisi kullanılmıştır. Bu yaklaşım sayesinde REST API, veritabanı, harita arayüzü ve rota hesaplama modülleri donanımdan bağımsız olarak test edilebilmiştir. Üretilen mock veriler, gerçek sensörlerden gelebilecek bin_id, fill_level, voltage, alarm ve timestamp alanlarını temsil etmektedir.
```

### Elektronik görselleri için açıklama

```text
Elektronik ekip tarafından sensör ve karşılaştırıcı devre mantığını açıklayan görsel destek materyalleri hazırlanmıştır. Ancak çalışan yazılım prototipinde sensör verisi fiziksel donanımdan değil, yazılım içerisinde oluşturulan random veri üretici modülden alınmıştır.
```

### Backend açıklaması

```text
Backend tarafında Python tabanlı bir REST API geliştirilmiştir. API, random sensör verisi üretme, çöp kutularının güncel durumlarını döndürme, ölçüm geçmişini listeleme ve rota hesaplama gibi işlevleri sağlamaktadır.
```

### Veritabanı açıklaması

```text
SQLite veritabanında çöp kutularına ait sabit bilgiler bins tablosunda, her ölçüm verisi ise measurements tablosunda saklanmaktadır. Böylece hem kutuların güncel durumu izlenebilmekte hem de geçmiş doluluk verileri kayıt altında tutulabilmektedir.
```

### Arayüz açıklaması

```text
Web arayüzünde kampüs üzerindeki çöp kutuları harita üzerinde gösterilmektedir. Kutular doluluk oranına göre yeşil, sarı ve kırmızı renklerle görselleştirilmekte; kullanıcı kutulara tıklayarak doluluk, voltaj, alarm ve güncelleme zamanı bilgilerini görüntüleyebilmektedir.
```

### Rota açıklaması

```text
Doluluk oranı %50 ve üzerindeki kutular toplama listesine alınmaktadır. Bu kutular arasında Manhattan mesafesi ve en yakın komşu yaklaşımı kullanılarak uygulanabilir bir rota önerisi oluşturulmaktadır. Rota sonucu harita üzerinde çizilmekte ve toplam mesafe kullanıcıya gösterilmektedir.
```

---

# 9. Haftalık / Günlük Çalışma Planı

Eğer süre azsa bu plan 5 günlük yoğun çalışma planı olarak uygulanabilir.

---

## Gün 1: Kurulum ve Temel Yapı

| Kişi | Yapılacak İş |
|---|---|
| Semih | Backend projesini kurar, `/api/health` endpointini yazar |
| İshak | SQLite tablolarını tasarlar, `database.py` başlangıcını yapar |
| Ulaş | Frontend klasörünü kurar, temel `index.html` ve harita iskeletini oluşturur |

### Gün 1 sonunda olması gerekenler

- Backend çalışıyor.
- DB dosyası oluşuyor.
- Frontend sayfası açılıyor.
- Harita boş da olsa görüntüleniyor.

---

## Gün 2: Veri Üretimi ve Veritabanı

| Kişi | Yapılacak İş |
|---|---|
| Semih | `sensor_simulator.py` dosyasını yazar |
| İshak | Veriyi DB’ye kaydetme ve status hesaplama fonksiyonlarını yazar |
| Ulaş | Haritada statik kutu markerlarını gösterir |

### Gün 2 sonunda olması gerekenler

- Random veri üretilebiliyor.
- Üretilen veri DB’ye kaydediliyor.
- Kutular haritada görünüyor.

---

## Gün 3: API ve Frontend Entegrasyonu

| Kişi | Yapılacak İş |
|---|---|
| Semih | `/api/bins`, `/api/simulate`, `/api/measurements` endpointlerini tamamlar |
| İshak | API’den gelen verinin DB’ye doğru yazıldığını test eder |
| Ulaş | Frontend’den API çağrısı yapar, marker renklerini günceller |

### Gün 3 sonunda olması gerekenler

- Simülasyon butonu çalışıyor.
- Marker renkleri değişiyor.
- Popup detayları görünüyor.

---

## Gün 4: Rota Hesaplama

| Kişi | Yapılacak İş |
|---|---|
| Semih | `/api/route` endpointini bağlar |
| İshak | Toplanması gereken kutuları döndüren DB fonksiyonunu yazar |
| Ulaş | `route_optimizer.py` ve haritada rota çizimini tamamlar |

### Gün 4 sonunda olması gerekenler

- Doluluk >= 50 olan kutular seçiliyor.
- Rota hesaplanıyor.
- Rota haritada çiziliyor.
- Toplam mesafe gösteriliyor.

---

## Gün 5: Test, Rapor ve Demo

| Kişi | Yapılacak İş |
|---|---|
| Semih | API test ekran görüntülerini alır, API dokümantasyonu yazar |
| İshak | DB testlerini yapar, test planını yazar |
| Ulaş | Arayüz ekran görüntülerini alır, demo akışını hazırlar |

### Gün 5 sonunda olması gerekenler

- Çalışan demo hazır.
- Test planı hazır.
- Rapor metinleri hazır.
- Ekran görüntüleri hazır.

---

# 10. Kişi Bazlı Detaylı Kontrol Listesi

---

## Semih Kontrol Listesi

### Backend kurulumu

- [ ] Python sanal ortam kuruldu.
- [ ] Flask/FastAPI kuruldu.
- [ ] `requirements.txt` hazırlandı.
- [ ] `app.py` oluşturuldu.
- [ ] Backend başlatma komutu test edildi.

### API

- [ ] `/api/health` çalışıyor.
- [ ] `/api/bins` çalışıyor.
- [ ] `/api/measurements` çalışıyor.
- [ ] `/api/simulate` çalışıyor.
- [ ] `/api/simulate/<bin_id>` çalışıyor.
- [ ] `/api/route` çalışıyor.

### Random veri

- [ ] `fill_level` 0–100 arasında üretiliyor.
- [ ] `voltage` doğru hesaplanıyor.
- [ ] `alarm` doğru hesaplanıyor.
- [ ] `status` doğru hesaplanıyor.
- [ ] Timestamp ekleniyor.

### Teslim

- [ ] API kodu tamamlandı.
- [ ] Postman/cURL testleri alındı.
- [ ] API dokümantasyonu yazıldı.

---

## İshak Kontrol Listesi

### Veritabanı

- [ ] `waste.db` oluşturuldu.
- [ ] `bins` tablosu oluşturuldu.
- [ ] `measurements` tablosu oluşturuldu.
- [ ] Başlangıç kutuları eklendi.
- [ ] Foreign key ilişkisi kuruldu.

### Fonksiyonlar

- [ ] `init_db()` yazıldı.
- [ ] `insert_initial_bins()` yazıldı.
- [ ] `save_measurement()` yazıldı.
- [ ] `update_bin_status()` yazıldı.
- [ ] `get_all_bins()` yazıldı.
- [ ] `get_measurements()` yazıldı.
- [ ] `get_bins_for_collection()` yazıldı.

### Test

- [ ] Simülasyon sonrası DB kaydı oluşuyor.
- [ ] Güncel kutu durumu güncelleniyor.
- [ ] Ölçüm geçmişi tutuluyor.
- [ ] Status mantığı doğru çalışıyor.

### Teslim

- [ ] DB şeması hazır.
- [ ] Test kayıtları hazır.
- [ ] Test planı yazıldı.

---

## Ulaş Kontrol Listesi

### Frontend

- [ ] `index.html` oluşturuldu.
- [ ] `style.css` oluşturuldu.
- [ ] `script.js` oluşturuldu.
- [ ] Leaflet.js bağlandı.
- [ ] Harita açılıyor.

### Harita

- [ ] Kutu markerları görünüyor.
- [ ] Marker renkleri status değerine göre değişiyor.
- [ ] Popup bilgileri doğru görünüyor.
- [ ] Simülasyon butonu çalışıyor.
- [ ] Rota butonu çalışıyor.

### Rota

- [ ] `/api/route` çağrılıyor.
- [ ] Rota çizgisi haritada gösteriliyor.
- [ ] Toplam mesafe yazılıyor.
- [ ] Boş rota durumu kontrol ediliyor.

### Teslim

- [ ] Arayüz ekran görüntüleri alındı.
- [ ] Rota ekran görüntüleri alındı.
- [ ] Demo akışı hazırlandı.

---

# 11. Kabul Kriterleri

Proje şu şartları sağlıyorsa çalışan prototip kabul edilebilir:

| Kriter | Başarı Durumu |
|---|---|
| Backend ayağa kalkıyor | Zorunlu |
| Random veri üretilebiliyor | Zorunlu |
| Veriler DB’ye kaydediliyor | Zorunlu |
| Kutular haritada gösteriliyor | Zorunlu |
| Doluluk durumuna göre renk değişiyor | Zorunlu |
| Doluluk >= 50 olan kutular seçiliyor | Zorunlu |
| Rota hesaplanıyor | Zorunlu |
| Rota haritada çiziliyor | Zorunlu |
| Ölçüm geçmişi tutuluyor | İyi olur |
| Demo ekran görüntüleri var | Zorunlu |
| Rapor metni hazır | Zorunlu |

---

# 12. Git/GitHub Çalışma Düzeni

## Branch önerisi

```text
main
backend-semih
database-ishak
frontend-ulas
```

## Commit örnekleri

```text
feat: add sensor simulator
feat: create sqlite database schema
feat: add bins API endpoint
feat: implement map markers
feat: add route calculation
fix: update marker colors after simulation
docs: add API documentation
```

## Çalışma kuralı

```text
1. Herkes kendi branchinde çalışır.
2. Kod çalışmadan main branche merge edilmez.
3. Merge öncesi en az bir kişi kodu kontrol eder.
4. Büyük değişiklikler küçük commitlere bölünür.
5. README sürekli güncel tutulur.
```

---

# 13. README İçeriği

`README.md` içinde şu başlıklar bulunmalı:

```text
# Smart Campus Waste Management System

## Project Description
## Technologies
## Folder Structure
## Installation
## Running Backend
## Running Frontend
## API Endpoints
## Sensor Simulation Logic
## Database Schema
## Route Calculation
## Demo Scenario
## Team Responsibilities
```

### Örnek kurulum komutları

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python app.py
```

Frontend için:

```text
frontend/index.html dosyası tarayıcıda açılır.
```

---

# 14. Olası Riskler ve Çözümler

| Risk | Çözüm |
|---|---|
| Elektronik veri gelmemesi | Random/mock veri kullanılacak |
| Frontend API’ye bağlanamaz | CORS açılacak, URL kontrol edilecek |
| DB kayıt yapmaz | `database.py` fonksiyonları ayrı test edilecek |
| Rota boş döner | Tüm kutular < 50 ise kullanıcıya mesaj gösterilecek |
| Harita koordinatları karışır | Başta sabit x-y koordinat sistemi belirlenecek |
| Süre yetmez | Önce minimum çalışan sistem yapılacak |
| Kodlar çakışır | Git branch düzeni kullanılacak |

---

# 15. Minimum Çalışan Sistem Sırası

Süre kısıtlıysa önce şu sırayla ilerleyin:

```text
1. Backend çalışsın.
2. Random veri üretilsin.
3. DB’ye kayıt yapılsın.
4. /api/bins veri döndürsün.
5. Frontend kutuları göstersin.
6. Simülasyon butonu markerları güncellesin.
7. /api/route rota döndürsün.
8. Frontend rotayı çizsin.
9. Ekran görüntüleri alınsın.
10. Rapor metni yazılsın.
```

Bu 10 adım tamamlanırsa proje demo yapılabilir seviyeye gelir.

---

# 16. Takıma Atılacak Kısa Görev Mesajı

```text
Arkadaşlar elektronik taraftan çalışan sensör verisi gelmeyeceği için sistemi 3 BM olarak random/mock sensör verisiyle kuracağız.

Semih: Backend, REST API ve random sensör verisi üretimi.
İshak: SQLite veritabanı, tablo yapısı, veri kaydetme ve durum mantığı.
Ulaş: Web arayüzü, Leaflet harita, marker renkleri ve rota çizimi.

Sistem akışı şöyle olacak:
Random veri → API → SQLite → durum hesaplama → harita → rota.

Önce minimum çalışan demo yapacağız:
1. Random veri üretilecek.
2. Veriler DB’ye kaydedilecek.
3. Haritada kutular yeşil/sarı/kırmızı görünecek.
4. Doluluk >= 50 olan kutular için rota çizilecek.

Elektronikçilerin hazırladığı görseller raporda destek materyali olarak kullanılabilir; ancak çalışan yazılım prototipi donanımdan bağımsız şekilde mock veriyle test edilecek.
```

---

# 17. Son Teslim Paketinde Olması Gerekenler

```text
1. Backend kodları
2. Frontend kodları
3. SQLite veritabanı veya oluşturma scripti
4. README.md
5. API dokümantasyonu
6. Test planı
7. Demo ekran görüntüleri
8. Rapor için yazılım açıklamaları
9. Elektronik görselleri varsa raporda destek olarak eklenmiş hali
10. Proje görev dağılımı tablosu
```

---

# 18. Nihai Sorumluluk Özeti

```text
Semih:
- app.py
- sensor_simulator.py
- API endpointleri
- API testleri

İshak:
- database.py
- models.py
- waste.db
- status mantığı
- test planı

Ulaş:
- index.html
- style.css
- script.js
- route_optimizer.py
- harita ve rota görselleştirme
```

---

# 19. Rapor İçin Kısa Sonuç Cümlesi

```text
Geliştirilen yazılım prototipi, fiziksel sensör verisi bulunmadığı durumda dahi random/mock sensör verileri üzerinden sistemin temel işlevlerini test edebilecek şekilde tasarlanmıştır. Bu kapsamda veri üretimi, REST API, SQLite veritabanı, harita tabanlı görselleştirme ve rota hesaplama modülleri entegre edilerek çalışan bir karar destek prototipi oluşturulmuştur.
```
