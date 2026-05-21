# Rapor Notları

Çalışan prototip, kampüs içi 12 çöp kutusunun doluluk durumunu takip eden ve toplama rotası üreten bir akıllı atık yönetim sistemi olarak geliştirilmiştir. Sistem Python/Flask tabanlı REST API, SQLite veritabanı ve tarayıcıda çalışan HTML/CSS/JavaScript arayüzünden oluşur.

Veri üretimi iki kaynağa ayrılmıştır. B01 numaralı kutu, EEM ekibinin LTspice ortamında ürettiği Op-Amp karşılaştırıcı transient çıktısı ile çalışır. Bu çıktı `backend/data/electronics_signal.tsv` dosyasında tutulur ve 0-10 saniye arasında 0V'dan 5V'a çıkan bir rampa sinyalidir. Yazılım bu voltajı `fill_level = round(V * 20)` formülüyle doluluk yüzdesine çevirir. Böylece 2.5V elektriksel eşik, yazılımda %50 doluluk ve alarm eşiği ile aynı noktaya karşılık gelir.

B02-B12 arası kutular yazılım tabanlı random, step ve demo simülasyonlarıyla beslenir. B01'in bu simülasyonlarla karışmaması için backend seviyesinde kural eklenmiştir; B01 yalnızca EEM endpointleri üzerinden değiştirilebilir.

Arayüzde kampüs görseli yerine doğrudan X/Y koordinatlarına dayalı kare bir harita kullanılır. Bu tercih, çöp kutusu koordinatları ile görsel harita arasındaki uyuşmazlığı ortadan kaldırmıştır. Her çöp kutusu kendi gerçek koordinatında gösterilir; yol ağı gri çizgilerle, aktif rotalar ise renkli çizgilerle çizilir.

Rota hesaplama tarafında Dijkstra algoritması kullanılan bir yol ağı modeli uygulanmıştır. Yol ağı kutu koordinatlarıyla uyumlu hale getirilmiş, yatay/dikey bağlantılara ek olarak bazı çapraz bağlantılar da tanımlanmıştır. Araçlar kutulara ve depoya yol ağı üzerinden hareket eder; yol olmayan yerlerden gitmez.

Çoklu görevli araç desteği eklenmiştir. Kullanıcı 1-5 arası araç seçebilir. Sistem görevleri basit sırayla değil, dengeli ve yakınlık temelli biçimde dağıtır. Bu sayede bir araca çok az, diğerine çok fazla görev verilmesi engellenir; yakın kutular mümkün olduğunca aynı görevliye atanır. Her görevlinin rotası farklı renkle gösterilir.

Sonuç olarak prototip; EEM sinyal entegrasyonu, yazılım simülasyonu, gerçek zamanlı durum gösterimi, yol ağı tabanlı rota hesaplama, çoklu araç animasyonu ve dengeli görev dağıtımı özelliklerini tek bir çalışan demo üzerinde birleştirmiştir.
