# BM Ekibi Yazılım Geliştirme Planı

> Son güncelleme: 2026-05-22  
> Canlı görev listesi: [TAKIM_GOREVLERI.md](TAKIM_GOREVLERI.md)

---

## 1. Kapsam

BM ekibinin sorumluluğu, EEM ve END çıktılarıyla konuşabilen çalışan yazılım prototipini oluşturmaktır. Güncel sistem:

- 12 kutu izler.
- `B01` kutusunu EEM LTspice sinyaliyle çalıştırır.
- `B02`-`B12` kutularını yazılım simülasyonu ile çalıştırır.
- Rota hesabını gerçek yol ağı üzerinden yapar.
- Çoklu görevli araçları dengeli ve renkli rotalarla gösterir.

---

## 2. Sistem Akışı

```text
EEM LTspice sinyali -> B01
Random/step/demo -> B02-B12
        |
        v
Flask API -> SQLite -> X/Y koordinat haritası -> rota + görevli animasyonu
```

---

## 3. Görev Dağılımı

| Kişi | Sorumluluk | Durum |
|---|---|---|
| Semih | Backend, DB, API, EEM entegrasyonu, frontend düzeltmeleri, rota/worker entegrasyonu, demo davranışı | Tamamlandı |
| İshak | Görsel kontrol, ekran görüntüleri, demo provası | Devam |
| Ulaş | Yol ağı/worker katkısı, test çıktıları | Devam |
| Zeynep/Buse | EEM devre ve LTspice transient çıktısı | Tamamlandı |
| Eılaf | END model ve literatür | Devam |

---

## 4. Tamamlanan Teknik İşler

| # | İş | Durum |
|---|---|---|
| 1 | Flask backend ve CORS | Tamamlandı |
| 2 | SQLite `bins` / `measurements` | Tamamlandı |
| 3 | 12 kutu seed verisi | Tamamlandı |
| 4 | Random, step, demo simülasyonları | Tamamlandı |
| 5 | B01 EEM-only kuralı | Tamamlandı |
| 6 | LTspice TSV okuyucu | Tamamlandı |
| 7 | EEM slider endpointleri | Tamamlandı |
| 8 | Yol ağı ve Dijkstra rota | Tamamlandı |
| 9 | Çapraz yol bağlantıları | Tamamlandı |
| 10 | Koordinat tabanlı frontend harita | Tamamlandı |
| 11 | Çoklu araç sayısı seçimi | Tamamlandı |
| 12 | Farklı renkli araç rotaları | Tamamlandı |
| 13 | Dengeli ve yakınlık temelli görev dağıtımı | Tamamlandı |
| 14 | Oto simülasyonun kaldırılması | Tamamlandı |
| 15 | API ve frontend syntax kontrolleri | Tamamlandı |

---

## 5. Minimum Demo Kriterleri

- [x] Backend açılıyor.
- [x] Frontend açılıyor.
- [x] 12 kutu haritada görünüyor.
- [x] B01 sadece EEM slider ile değişiyor.
- [x] B02-B12 random/demo/step ile değişiyor.
- [x] Rota yol ağı üzerinden çiziliyor.
- [x] Araçlar yol olmayan yerlerden gitmiyor.
- [x] Çoklu araç rotaları farklı renkte.
- [x] Görev dağıtımı dengeli.
- [x] Toplanan kutular DB'de sıfırlanıyor.
- [ ] Tarayıcı görsel kontrolü ve ekran görüntüleri alınacak.

---

## 6. Riskler ve Önlemler

| Risk | Önlem |
|---|---|
| B01'in simülasyonla karışması | Backend B01'e random/external veriyi 400 ile reddeder |
| Eski JS cache'i | `index.html` cache buster + hard refresh |
| Rota yol dışına çıkması | Her kutu için gerçek X/Y yol düğümü var |
| Araçların dengesiz görev alması | Maksimum yük sınırı + yakınlık temelli atama |
| Demo sırasında belirsiz random sonuç | `Demo Verisi Üret` kontrollü senaryo üretir |

---

## 7. Rapor İçin Kısa Sonuç

Geliştirilen prototipte B01 numaralı kutu EEM ekibinin LTspice transient çıktısı ile çalıştırılmış, diğer 11 kutu ise yazılım tabanlı sensör simülasyonu ile beslenmiştir. Flask REST API, SQLite veritabanı, X/Y koordinatlı frontend harita, Dijkstra tabanlı yol ağı rotası ve çoklu görevli araç animasyonu birleştirilerek uçtan uca çalışan akıllı atık toplama demo sistemi oluşturulmuştur.
