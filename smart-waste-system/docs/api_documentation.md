# 🔌 API Dokümantasyonu

> **Proje:** Akıllı Kampüs Atık Yönetim Sistemi  
> **Base URL:** `http://127.0.0.1:5001`

---

## Genel Endpointler

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/health` | Sunucu sağlık kontrolü |
| GET | `/api/bins` | Tüm kutu durumları |
| GET | `/api/measurements` | Ölçüm geçmişi |
| GET | `/api/dashboard` | Özet istatistikler |
| GET | `/api/roads` | Yol ağı node/edge bilgileri |
| GET | `/api/collection-bins` | Toplanması gereken kutular |

---

## Simülasyon

| Metot | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/simulate/random` | Tüm kutulara random doluluk üret |
| POST | `/api/simulate/step` | 1–3 kutunun doluluğunu artır |
| POST | `/api/simulate/demo` | Demo için yeşil/sarı/kırmızı dağılım üret |
| POST | `/api/reset` | Sistemi başlangıç durumuna getir |

---

## Rota ve Görevli

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/route/worker?start_x=&start_y=` | Görevli konumundan rota hesapla |
| GET | `/api/worker` | Görevli durumu |
| POST | `/api/worker/collect/<bin_id>` | Kutu toplandı işaretle |
| POST | `/api/worker/reset` | Görevliyi depoya döndür |

---

## Örnek Yanıtlar

### `GET /api/bins`
```json
[
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
]
```

### `GET /api/route/worker`
```json
{
  "start": { "x": 0, "y": 0, "name": "Depo" },
  "route": [
    { "bin_id": "B03", "name": "Yemekhane", "current_status": "critical", "x": 75, "y": 50 }
  ],
  "path_coordinates": [
    { "x": 0, "y": 0 }, { "x": 25, "y": 0 }, { "x": 75, "y": 50 }
  ],
  "total_distance": 100
}
```
