# 🎬 Demo Senaryosu

## Demo Akışı

```
1. Backend başlatılır: python3 app.py
2. Frontend açılır: http://localhost:8000
3. Haritada kampüs, yollar, depo ve çöp kutuları görünür.
4. "Demo Verisi Üret" butonuna basılır.
5. Kutular yeşil / sarı / kırmızı olur, dashboard güncellenir.
6. "Rota Hesapla" butonuna basılır.
7. Görevlinin konumundan en kısa rota çizilir.
8. "Görevliyi Gönder" butonuna basılır.
9. Görevli rota üzerinde hareket eder.
10. Kutuya ulaşınca kutu boşaltılır ve yeşile döner.
11. Yeni hedef varsa rota yeniden hesaplanır.
12. Hedef kalmazsa görevli depoya döner.
```

---

## Sunumda Kullanılacak Metin

Bu sistemde fiziksel sensör verisi yerine yazılım içinde üretilen anlık/random sensör verileri kullanılmaktadır. Her çöp kutusu için doluluk oranı, voltaj, alarm ve durum bilgisi backend tarafından hesaplanır. Doluluk oranı %50 altındaki kutular yeşil, %50–79 arası kutular sarı, %80 ve üzeri kutular kırmızı olarak gösterilir.

Görevli araç haritada mevcut konumundan başlar. Sistem toplanması gereken kutuları belirler, kritik kutulara öncelik verir ve en kısa rotayı hesaplar. Rota harita üzerinde çizgi olarak gösterilir. Araç kutuya ulaştığında kutu boşaltılmış kabul edilir ve yeşil duruma döner.
