# ✅ Test Planı

## API Testleri

- [ ] `GET /api/health` → 200 döner
- [ ] `GET /api/bins` → 8 kutu listesi döner
- [ ] `POST /api/simulate/random` → tüm kutular güncellenir
- [ ] `POST /api/simulate/demo` → en az 1 kritik, 2 sarı kutu var
- [ ] `GET /api/collection-bins` → sadece sarı/kırmızı kutular döner
- [ ] `GET /api/route/worker` → geçerli rota ve `path_coordinates` döner
- [ ] `POST /api/reset` → tüm kutular başlangıç durumuna döner
- [ ] `POST /api/worker/collect/<bin_id>` → kutu %0–10 arası sıfırlanır

## Senaryo Testleri

- [ ] Tüm kutular yeşilken rota isteği → boş rota döner
- [ ] Görevli aktifken simülasyon butonu → çakışma olmaz
- [ ] Görevli hedefe varır → kutu yeşile döner
- [ ] Yeni kritik kutu çıkar → sıraya eklenir

## Görünüm Testleri

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
