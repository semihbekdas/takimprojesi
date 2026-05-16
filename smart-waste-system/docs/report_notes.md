# 📝 Rapor Metni

Çalışan prototipte fiziksel sensör verisi yerine yazılım tabanlı anlık/random sensör verisi kullanılmıştır. Üretilen veriler, gerçek sensörlerden gelebilecek `bin_id`, `fill_level`, `voltage`, `alarm`, `status` ve `timestamp` alanlarını temsil etmektedir.

Backend tarafında Python/Flask tabanlı bir REST API geliştirilmiştir. API; random sensör verisi üretme, çöp kutularının güncel durumlarını döndürme, ölçüm geçmişini listeleme ve rota hesaplama işlevlerini sağlamaktadır. SQLite veritabanında kutu bilgileri `bins`, ölçüm verileri `measurements` tablosunda saklanmaktadır.

Yazılım tarafı, EEM ekibinin LTspice ortamında tasarladığı Op-Amp karşılaştırıcı devresinin transient analiz çıkışını da girdi olarak kabul edebilmektedir. Söz konusu çıkış, 0–10 saniyelik 0V–5V'luk rampa sinyalini içermekte ve 2.5V referans seviyesi geçildiğinde alarm üretimini tetiklemektedir. REST API üzerindeki `/api/electronics-signal` ve `/api/simulate/electronics` uç noktaları aracılığıyla bu sinyal B01 numaralı çöp kutusuna eşlenmekte; voltaj değeri yazılım tarafında `fill_level = round(V × 20)` formülüyle doluluk yüzdesine dönüştürülerek aynı veritabanına yazılmaktadır. Bu sayede çalışan prototip, donanımdan tamamen bağımsız random veri ile çalıştırılabildiği gibi, EEM ekibinin ürettiği gerçek karşılaştırıcı çıktısı ile de uçtan uca test edilebilmektedir.

Web arayüzünde kampüs haritası üzerindeki çöp kutuları doluluk oranına göre yeşil, sarı ve kırmızı renklerle gösterilmektedir. Doluluk oranı %50 ve üzerindeki kutular toplama listesine alınmaktadır. Görevli araç, mevcut konumundan başlayarak kritik kutulara öncelik veren en kısa rota üzerinden hareket etmekte; kutuya varıldığında kutu boşaltılmış kabul edilerek yeşil duruma döndürülmektedir.

Geliştirilen prototip; veri üretimi, REST API, SQLite veritabanı, harita tabanlı görselleştirme ve rota hesaplama modüllerini bütünleşik biçimde göstermektedir.
