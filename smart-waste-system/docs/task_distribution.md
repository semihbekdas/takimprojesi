# 👥 Görev Dağılımı ve Sorumluluklar

Sistem, yazılım tabanlı sensör simülasyonu ile geliştirilmektedir. Aşağıdaki tablo, projedeki temel modüllerin geliştirilmesinden sorumlu kişileri ve hedeflenen çıktıları göstermektedir.

---

## 1. Semih (Backend ve API)

**Sorumluluklar:**
- Flask REST API mimarisinin kurulması ve sürdürülmesi
- SQLite veritabanı yapısının oluşturulması (`bins` ve `measurements` tabloları)
- Simülasyon motorunun (random, step, demo) yazılması
- Algoritmik veri hesaplamaları (Doluluk, voltaj, alarm ve durum fonksiyonları)
- API veri doğrulama (validation) mekanizmalarının eklenmesi
- Gerekli tüm endpointlerin (`/api/bins`, `/api/route`, vb.) çalışır durumda tutulması
- Projenin README ve API dokümantasyonunun güncel tutulması

**Teslim Edilecek Çıktı:** 
Kararlı çalışan ve frontend ile sorunsuz haberleşen bir REST API, yapılandırılmış veritabanı ve güvenilir bir simülasyon veri kaynağı.

---

## 2. İshak (Frontend ve Kullanıcı Arayüzü)

**Sorumluluklar:**
- Kullanıcı dostu, modern bir web arayüzünün (HTML/CSS/JS) tasarlanması
- Leaflet.js tabanlı kampüs haritasının çizimi (binalar, yollar, yeşil alanlar)
- Çöp kutularının (marker) doluluk oranına göre (yeşil, sarı, kırmızı) dinamik gösterimi
- Görevli aracının hareketinin görsel olarak simüle edilmesi (animasyonlar)
- Rota çizgisinin harita üzerinde kullanıcıya sunulması
- Sistem dashboard'unun (toplam kutu, aktif durum vb.) anlık güncellenmesi
- Kullanıcı etkileşim butonlarının (simülasyon başlatma, rota hesaplama vb.) işlevselleştirilmesi

**Teslim Edilecek Çıktı:** 
Cihaz uyumlu, akıcı, anlık verileri doğru gösteren, animasyonlu harita ve kontrol paneline sahip temiz bir frontend uygulaması.

---

## 3. Ulaş (Yol Ağı, Rota Optimizasyonu ve Entegrasyon)

**Sorumluluklar:**
- Kampüs yol ağının matematiksel modellemesi (`road_network.py` node/edge matrisi)
- Dijkstra veya uygun bir algoritma kullanılarak görevlinin konumundan çöp kutularına giden en kısa ve en verimli yolun hesaplanması
- Rota üzerinde kritik (kırmızı) kutulara öncelik verecek mantığın kurulması
- Görevli aracın mantıksal durum kontrolü (`worker_service.py` - aktif, pasif, depoda)
- Kutu toplama işlemi bittiğinde backend'e "boşaltıldı" bilgisinin entegre edilmesi
- Tüm uçtan uca sistem entegrasyonu testlerinin yazılması (`test_api.py`)
- Demo senaryolarının uçtan uca doğrulanması

**Teslim Edilecek Çıktı:** 
Akıllı rota hesaplama yeteneği, bağımsız çalışan görevli mantığı (worker service) ve sistemin güvenilirliğini doğrulayan uçtan uca test raporları.

---

## Genel Ortak Hedefler

1. Random veri üretimi ile kutuların anlık doluluk verisinin değiştirilmesi.
2. Çöplerin yeşil, sarı, kırmızı olacak şekilde haritada güncellenmesi.
3. Görevli aracın hedeflenen çöplere en kısa rota üzerinden ulaşıp toplama işlemini tamamlaması.
4. Toplanan çöplerin boşaltıldığının sisteme kaydedilerek yeşile döndürülmesi.
5. Kullanıcı arayüzünün (Dashboard) ve Aktivite Logunun bu olaylarla eşzamanlı olarak anlık güncellenmesi.
