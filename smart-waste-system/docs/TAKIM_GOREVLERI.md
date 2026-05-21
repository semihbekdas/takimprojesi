# Takım Görevleri ve Güncel Durum

> Güncelleme: 2026-05-22  
> Hazırlayan: Semih  
> Amaç: Kodda yapılan işleri, kalan demo hazırlığını ve kişi sorumluluklarını tek yerde tutmak.

---

## 1. Mevcut Sistem Durumu

| Katman | Durum | Sorumlu |
|---|---|---|
| Backend Flask API | Çalışıyor, `127.0.0.1:5001` | Semih |
| SQLite veritabanı | `bins` + `measurements`, reset ve seed çalışıyor | Semih |
| Seed verisi | 12 kutu: `B01`-`B12` | Semih |
| B01 EEM entegrasyonu | Sadece LTspice/EEM sinyaliyle değişiyor | Semih |
| Random / step / demo simülasyonu | Sadece `B02`-`B12` kutularını değiştiriyor | Semih |
| Yol ağı | 12 kutu düğümü + depo + giriş, yatay/dikey/çapraz bağlantılar | Semih + Ulaş |
| Rota algoritması | `/api/route/road`, Dijkstra + kritik öncelik | Semih + Ulaş |
| Görevli araçlar | 1-5 araç, yol ağı üzerinde hareket | Semih |
| Görev dağıtımı | Dengeli yük + yakın kutuları aynı araca verme mantığı | Semih |
| Frontend harita | Leaflet kaldırıldı, gerçek X/Y koordinatlı kare harita | Semih |
| Rota çizimi | Tek rota mavi, çoklu araçta her aracın rotası kendi renginde | Semih |
| EEM UI | B01 slider + canvas grafik + tüm sinyali uygula | Semih |
| Oto simülasyon | Kaldırıldı | Semih |

---

## 2. Semih'in Tamamladığı İşler

- Flask backend endpointleri bağlandı: `/api/health`, `/api/bins`, `/api/dashboard`, `/api/measurements`, `/api/collection-bins`, `/api/reset`.
- Simülasyon endpointleri ayrıldı: `/api/simulate/random`, `/api/simulate/step`, `/api/simulate/demo`.
- `B01` EEM-only yapıldı; random/demo/step ve `/api/external-data` B01'i değiştirmez.
- EEM endpointleri sadece `B01` kabul eder: `/api/electronics-signal`, `/api/electronics-signal/apply`, `/api/simulate/electronics`.
- 12 kutu seed edildi: `B01`-`B12`.
- Yol ağı kutu koordinatlarıyla eşitlendi; araçlar artık yol olmayan yerlerden gitmiyor.
- Çapraz yollar eklendi, böylece kampüs yolu daha doğal görünüyor.
- `/api/road-path` eklendi; araçlar depoya dönerken de yol ağı üzerinden dönüyor.
- Frontend Leaflet ve kampüs resmi bağımlılığından çıkarıldı; kare X/Y koordinat haritası kullanılıyor.
- Çoklu araç sayısı elle ayarlanabilir hale getirildi.
- Araç rotaları farklı renklerde çiziliyor.
- Görev dağıtımı dengelendi; bir araca 1, diğerine 10 görev verilmesi engellendi.
- Yakın kutular mümkünse aynı araca atanıyor.
- Oto simülasyon kaldırıldı; kontrol demo/random/step ve EEM slider üzerinden manuel.
- Backend ve frontend syntax kontrolleri yapıldı.

---

## 3. Güncel Demo Akışı

1. Backend başlat: `cd smart-waste-system/backend && source venv/bin/activate && python3 app.py`
2. Frontend başlat: `cd smart-waste-system/frontend && python3 -m http.server 8000`
3. Aç: `http://localhost:8000`
4. Gerekirse `Cmd+Shift+R` ile hard refresh yap.
5. `Sıfırla` ile temiz başlangıç al.
6. `Demo Verisi Üret` veya `Random Veri Üret` ile `B02`-`B12` verilerini oluştur.
7. EEM panelinde B01 slider:
   - `t=0-4`: B01 yeşil
   - `t≈5`: B01 sarı
   - `t=8-10`: B01 kırmızı
8. Araç sayısını 1-5 arasında seç.
9. `Rota Göster` ile genel rotayı çiz.
10. `Görevlileri Gönder` ile dengeli çoklu araç turunu başlat.

---

## 4. Demo Kontrol Listesi

- [x] Backend health endpoint çalışıyor.
- [x] Frontend açılıyor.
- [x] 12 çöp kutusu haritada gerçek X/Y koordinatlarında görünüyor.
- [x] B01 EEM rozetiyle ayrılıyor.
- [x] B01 random/demo/step ile değişmiyor.
- [x] B01 EEM slider ile yeşil/sarı/kırmızı değişiyor.
- [x] Random/demo/step `B02`-`B12` için çalışıyor.
- [x] Kritik kutularda pulse efekti var.
- [x] Rota yol ağı üzerinden çiziliyor.
- [x] Araçlar yol dışına çıkmadan hareket ediyor.
- [x] Çoklu araç rotaları farklı renklerde çiziliyor.
- [x] Görev dağıtımı dengeli ve yakınlık temelli.
- [x] Toplanan kutular yeşile dönüyor.
- [x] Tur bitince araçlar depoya yol ağı üzerinden dönüyor.
- [ ] Chrome, Safari ve Firefox'ta son görsel kontrol yapılacak.
- [ ] Sunum için 6-8 ekran görüntüsü alınacak.
- [ ] Final rapora güncel 12 kutu ve B01 EEM-only bilgisi geçirilecek.

---

## 5. Kalan İşler

| İş | Sorumlu | Not |
|---|---|---|
| Tarayıcı görsel kontrolü | İshak / Semih | Chrome, Safari, Firefox |
| Ekran görüntüleri | İshak | Reset, demo, route, worker, EEM slider |
| Test sonuçlarını rapora ekleme | Ulaş / Semih | Backend doğrulama çıktıları kullanılabilir |
| Sunum provası | Hepsi | Demo akışı yukarıdaki sırayla yapılacak |

Kod tarafında bilinen açık hata yok.

---

## 6. Önemli Kurallar

- Demo'da kanonik rota endpointi `/api/route/road`.
- `/api/route` legacy Manhattan endpointidir; demo anlatımında kullanılmamalı.
- B01 sadece EEM/LTspice sinyalini temsil eder.
- `B02`-`B12` yazılım simülasyonu ile çalışır.
- Tarayıcı eski JS tutarsa `Cmd+Shift+R` yapılmalı.
- Demo öncesi mutlaka `POST /api/reset` ve `POST /api/worker/reset` çalıştırılmalı.
