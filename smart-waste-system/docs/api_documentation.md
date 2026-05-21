# API Dokümantasyonu

> Base URL: `http://127.0.0.1:5001`

---

## Genel

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/health` | Sağlık kontrolü |
| GET | `/api/bins` | 12 kutunun güncel durumu |
| GET | `/api/measurements` | Son 100 ölçüm |
| GET | `/api/collection-bins` | Doluluğu %50 ve üstü kutular |
| GET | `/api/dashboard` | Toplam, normal, sarı, kırmızı, ölçüm sayısı |

---

## Simülasyon

`B01` EEM-only kutudur. Aşağıdaki simülasyon endpointleri sadece `B02`-`B12` kutularını değiştirir.

| Metot | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/simulate` | `/api/simulate/random` alias |
| POST | `/api/simulate/random` | Mevcut doluluğu azaltmadan random değer üretir |
| POST | `/api/simulate/step` | Mevcut doluluğa 3-12 puan ekler |
| POST | `/api/simulate/demo` | Demo için kontrollü sarı/kırmızı dağılım üretir |
| POST | `/api/simulate/<bin_id>` | Tek kutu random; `B01` için 400 döner |
| POST | `/api/external-data` | Dış veri alır; `B01` için 400 döner |
| POST | `/api/reset` | DB'yi 12 kutu başlangıç durumuna döndürür |

Örnek `POST /api/simulate/random`:

```json
{
  "mode": "random",
  "excluded_bins": ["B01"],
  "count": 11,
  "data": [
    { "bin_id": "B02", "fill_level": 55, "voltage": 2.75, "alarm": 1, "status": "needs_collection", "timestamp": "..." }
  ]
}
```

---

## EEM / LTspice

EEM sinyali yalnızca `B01` kutusuna uygulanır. `B02`-`B12` için bu endpointler 400 döndürür.

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/electronics-signal?samples=N` | LTspice sinyalinden N örnek döndürür |
| POST | `/api/electronics-signal/apply?bin_id=B01&t=5.0` | t anındaki voltajı B01'e uygular |
| POST | `/api/simulate/electronics?bin_id=B01&samples=21` | 0-10 sn sinyalini B01 geçmişine yazar |

Mapping:

```text
fill_level = round(voltage * 20)
alarm = 1 if fill_level >= 50 else 0
status = normal | needs_collection | critical
```

Örnek:

```json
{
  "t": 5.0,
  "data": {
    "bin_id": "B01",
    "fill_level": 50,
    "voltage": 2.5,
    "alarm": 1,
    "status": "needs_collection"
  }
}
```

---

## Rota ve Yol Ağı

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/route/road?start_x=&start_y=&start_name=` | Kanonik demo rotası; Dijkstra + kritik öncelik |
| GET | `/api/road-path?start_x=&start_y=&target_node=` | Mevcut konumdan hedef yol düğümüne yol ağı rotası |
| GET | `/api/roads` | `nodes`, `edges`, `bin_node_map` |
| GET | `/api/route?start_x=&start_y=&start_name=` | Legacy Manhattan rota; demo için kullanılmaz |

Örnek rota adımı:

```json
{
  "bin_id": "B07",
  "name": "Erkek Yurdu",
  "x": 75,
  "y": 75,
  "current_status": "critical",
  "road_node": "B07_NODE",
  "path_nodes_from_previous": ["DEPOT", "GATE", "B06_NODE", "B09_NODE", "B01_NODE", "B02_NODE", "B07_NODE"],
  "road_distance_from_previous": 145.36
}
```

---

## Worker

Backend tarafında tekil worker service bulunur; frontend çoklu araç animasyonunu kendi içinde koordine eder.

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/worker/status` | Worker state |
| GET | `/api/worker/route` | Worker konumundan rota oluşturur |
| POST | `/api/worker/start` | Worker turu başlatır |
| POST | `/api/worker/collect/<bin_id>` | Kutuyu DB'de sıfırlar |
| POST | `/api/worker/reset` | Worker'ı depoya döndürür |

---

## Veri Şeması

### Bin

```json
{
  "bin_id": "B03",
  "name": "Yemekhane",
  "location": "Cafeteria",
  "x": 75,
  "y": 50,
  "current_fill_level": 84,
  "current_voltage": 4.2,
  "current_alarm": 1,
  "current_status": "critical",
  "last_updated": "2026-05-22T12:00:00"
}
```

### Sensor Payload

```json
{
  "bin_id": "B03",
  "fill_level": 84,
  "voltage": 4.2,
  "alarm": 1,
  "status": "critical",
  "timestamp": "2026-05-22T12:00:00"
}
```

---

## Hata Kodları

| Kod | Senaryo |
|---|---|
| 400 | Eksik/geçersiz `fill_level`, `t`, `samples`, veya B01'e simülasyon verisi yazma |
| 400 | EEM sinyalini B01 dışında bir kutuya uygulama |
| 404 | Bilinmeyen `bin_id` |
