# 📝 Rapor Metni

Çalışan prototipte fiziksel sensör verisi yerine yazılım tabanlı anlık/random sensör verisi kullanılmıştır. Üretilen veriler, gerçek sensörlerden gelebilecek `bin_id`, `fill_level`, `voltage`, `alarm`, `status` ve `timestamp` alanlarını temsil etmektedir.

Backend tarafında Python/Flask tabanlı bir REST API geliştirilmiştir. API; random sensör verisi üretme, çöp kutularının güncel durumlarını döndürme, ölçüm geçmişini listeleme ve rota hesaplama işlevlerini sağlamaktadır. SQLite veritabanında kutu bilgileri `bins`, ölçüm verileri `measurements` tablosunda saklanmaktadır.

Web arayüzünde kampüs haritası üzerindeki çöp kutuları doluluk oranına göre yeşil, sarı ve kırmızı renklerle gösterilmektedir. Doluluk oranı %50 ve üzerindeki kutular toplama listesine alınmaktadır. Görevli araç, mevcut konumundan başlayarak kritik kutulara öncelik veren en kısa rota üzerinden hareket etmekte; kutuya varıldığında kutu boşaltılmış kabul edilerek yeşil duruma döndürülmektedir.

Geliştirilen prototip; veri üretimi, REST API, SQLite veritabanı, harita tabanlı görselleştirme ve rota hesaplama modüllerini bütünleşik biçimde göstermektedir.
