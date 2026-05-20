# 🔌 API Dokümantasyonu

> **Proje:** Akıllı Kampüs Atık Yönetim Sistemi
> **Base URL:** `http://127.0.0.1:5001`

---

## Genel Endpointler

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/health` | Sunucu sağlık kontrolü |
| GET | `/api/bins` | Tüm kutu durumları |
| GET | `/api/measurements` | Son 100 ölçüm (tarihe göre azalan) |
| GET | `/api/collection-bins` | Doluluğu %50 ve üzeri kutular |
| GET | `/api/dashboard` | Özet istatistikler (durum sayıları, ölçüm sayısı) |

## Simülasyon

| Metot | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/simulate` | Geriye dönük uyumluluk için `/api/simulate/random` alias'ı |
| POST | `/api/simulate/random` | Tüm kutulara 0–100 arası random doluluk üretir |
| POST | `/api/simulate/step` | Tüm kutuların mevcut doluluğuna 3–12 puan ekler |
| POST | `/api/simulate/demo` | Demo için garanti yeşil/sarı/kırmızı dağılım üretir |
| POST | `/api/simulate/<bin_id>` | Tek kutu için random veri (404: bilinmeyen `bin_id`) |
| POST | `/api/external-data` | Dış kaynaktan ölçüm verisi alır (validasyon dahil) |
| POST | `/api/reset` | DB'yi sıfırlayıp 8 kutuyu başlangıç durumuna döndürür |

## Rota

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/route?start_x=&start_y=&start_name=` | ⚠️ Legacy: Manhattan + saf en yakın komşu, critical-first **yok**. Geriye dönük uyumluluk için tutuluyor. |
| GET | `/api/route/road?start_x=&start_y=&start_name=` | ✅ **Kanonik demo endpoint.** Yol ağı üzerinden Dijkstra + critical-first öncelik. Çıktıda `road_path` (waypoint listesi) ve her durak için `path_nodes_from_previous`. |

## Yol Ağı

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/roads` | Yol ağının `nodes`, `edges` ve `bin_node_map` bilgileri. Frontend harita üstünde yolları çizmek için kullanır. |

## Görevli (Worker)

Singleton bir worker servisi. State sunucu ömrü boyunca bellek içinde yaşar (restart'ta sıfırlanır — kabul edilebilir).

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET  | `/api/worker/status` | Mevcut durum: `id`, `x`/`y`, `status` (idle/working/collecting/route_ready), `current_target`, `completed_bins`, `last_route`. |
| GET  | `/api/worker/route` | Mevcut kutular için yeni rota hesaplar (worker konumundan başlayarak). `status='route_ready'` yapar. |
| POST | `/api/worker/start` | Rotayı hesaplayıp ilk hedefe ayarlar (`status='working'`). Boş rota varsa idle döner. |
| POST | `/api/worker/collect/<bin_id>` | Belirtilen kutuyu toplandı olarak işaretler, DB'de `fill_level=0`'a sıfırlar. 404: bilinmeyen `bin_id`. |
| POST | `/api/worker/reset` | Worker'ı depoya (0,0) döndürür, `completed_bins` listesini boşaltır. |

### Örnek: `GET /api/route/road`

```json
{
  "start": { "x": 0, "y": 0, "name": "Depo", "road_node": "DEPOT" },
  "route": [
    {
      "bin_id": "B05",
      "name": "Rektörlük",
      "x": 50, "y": 25,
      "current_status": "critical",
      "road_node": "CENTER",
      "road_distance_from_previous": 75.04,
      "path_nodes_from_previous": ["DEPOT", "GATE", "PARKING", "CAFETERIA", "CENTER"]
    }
  ],
  "road_path": [
    { "node_id": "DEPOT",     "name": "Depo",      "x": 0,  "y": 0  },
    { "node_id": "GATE",      "name": "Ana Giriş", "x": 10, "y": 10 },
    { "node_id": "PARKING",   "name": "Otopark",   "x": 60, "y": 15 },
    { "node_id": "CAFETERIA", "name": "Yemekhane", "x": 55, "y": 35 },
    { "node_id": "CENTER",    "name": "Öğr. Mrkz.", "x": 45, "y": 60 }
  ],
  "total_distance": 174.7,
  "message": "Gerçek yol ağına göre rota hesaplandı."
}
```

## EEM Elektronik Sinyali (LTspice)

EEM ekibinin LTspice transient çıkışı (`backend/data/electronics_signal.tsv`)
0–10 saniye boyunca 0V → 5V rampa. Eşik 2.5V (5. saniyede), bu noktadan
itibaren alarm=1. Sinyal **yalnızca B01 kutusuna** uygulanır; diğer 7 kutu
random/step/demo modlarıyla çalışmaya devam eder.

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET  | `/api/electronics-signal?samples=N` | Sinyalden eşit aralıklı N örnek (default 21, max 1000). Yan etkisiz, grafik/slider için. |
| POST | `/api/electronics-signal/apply` | Body veya query: `bin_id` (default B01), `t` (sn). t anındaki voltajı ve fill_level'ı kutuya uygular. |
| POST | `/api/simulate/electronics?samples=N&bin_id=B01` | 0–10 sn arasından N örnek alıp B01'in geçmişine bulk yazar; mevcut durum son örnek olur. |

### Mapping

```
fill_level = round(voltage * 20)   # 5V = 100%
alarm      = 1 if fill_level >= 50 else 0
status     = normal | needs_collection | critical
```

### Örnek: `GET /api/electronics-signal?samples=11`

```json
{
  "source": "LTspice transient (Op-Amp comparator input)",
  "threshold_voltage": 2.5,
  "voltage_to_fill_factor": 20,
  "t_min": 0.0, "t_max": 10.0,
  "sample_count_in_file": 1201,
  "samples": [
    { "t": 0.0,  "voltage": 0.0, "fill_level": 0,   "above_threshold": false },
    { "t": 5.0,  "voltage": 2.5, "fill_level": 50,  "above_threshold": true  },
    { "t": 10.0, "voltage": 5.0, "fill_level": 100, "above_threshold": true  }
  ]
}
```

### Hata Kodları (EEM endpointleri)

| Kod | Senaryo |
|---|---|
| 400 | `t` aralık dışı (sinyal 0–10 sn), `samples` 2–1000 dışı |
| 404 | Bilinmeyen `bin_id` |

---

## Veri Şeması

### Bin (kutu)
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
  "last_updated": "2026-05-08T14:30:00"
}
```

### Sensor payload
```json
{
  "bin_id": "B03",
  "fill_level": 84,
  "voltage": 4.2,
  "alarm": 1,
  "status": "critical",
  "timestamp": "2026-05-08T14:30:00"
}
```

`status` mantığı: `0–49 → normal`, `50–79 → needs_collection`, `80–100 → critical`.
`voltage = fill_level / 100 * 5`, `alarm = 1 if fill_level >= 50 else 0`.

---

## Örnek Yanıtlar

### `GET /api/dashboard`
```json
{
  "total_bins": 8,
  "normal": 5,
  "needs_collection": 2,
  "critical": 1,
  "collection_queue": 3,
  "measurement_count": 24,
  "last_measurement_at": "2026-05-16T16:11:19"
}
```

### `POST /api/simulate/demo`
```json
{
  "mode": "demo",
  "count": 8,
  "data": [
    { "bin_id": "B03", "fill_level": 92, "voltage": 4.6, "alarm": 1, "status": "critical",         "timestamp": "..." },
    { "bin_id": "B05", "fill_level": 68, "voltage": 3.4, "alarm": 1, "status": "needs_collection", "timestamp": "..." }
  ]
}
```

### `GET /api/route`
```json
{
  "start": { "x": 0, "y": 0, "name": "Depo" },
  "route": [
    { "bin_id": "B03", "name": "Yemekhane", "current_status": "critical", "x": 75, "y": 50 }
  ],
  "total_distance": 125
}
```

---

## Hata Kodları

| Kod | Senaryo |
|---|---|
| 400 | `fill_level` 0–100 dışında ya da eksik alan |
| 404 | Bilinmeyen `bin_id` (`/api/simulate/<bin_id>`, `/api/external-data`) |
