# Demo Senaryosu

## Hazırlık

```bash
cd smart-waste-system/backend
source venv/bin/activate
python3 app.py
```

```bash
cd smart-waste-system/frontend
python3 -m http.server 8000
```

Açılacak adres:

```text
http://localhost:8000
```

Sayfa eski görünürse `Cmd+Shift+R` ile hard refresh yapılır.

---

## Demo Akışı

1. `Sıfırla` butonuna basılır.
2. Haritada 12 kutu, depo ve gri yol ağı gösterilir.
3. B01'in EEM özel kutusu olduğu belirtilir.
4. `Demo Verisi Üret` butonuna basılır.
5. `B02`-`B12` kutuları yeşil/sarı/kırmızı olarak güncellenir.
6. EEM slider `t=5` civarına getirilir; B01 sarı olur.
7. EEM slider `t=8-10` aralığına getirilir; B01 kırmızı olur.
8. Araç sayısı 2-5 arasında seçilir.
9. `Rota Göster` ile genel rota gösterilir.
10. `Görevlileri Gönder` ile araçlar başlatılır.
11. Her aracın rotası kendi renginde görünür.
12. Yakın kutuların aynı araca, uzak bölgelerin farklı araçlara verildiği logdan anlatılır.
13. Araçlar yol ağı üzerinde hareket eder.
14. Kutu toplanınca yeşile döner.
15. Tüm görevler bitince araçlar depoya döner.

---

## Sunum Metni

Bu prototipte fiziksel sensör bulunmayan kutular için yazılım tabanlı simülasyon verisi kullanılır. B02-B12 arası kutular random, step ve demo modlarıyla değişir. B01 ise özel olarak EEM ekibinin LTspice transient çıktısına bağlanmıştır; bu nedenle B01 yalnızca EEM slider veya tüm sinyali uygula butonu ile değişir.

Doluluk oranı %50'yi geçtiğinde sistem kutuyu sarı, %80'i geçtiğinde kırmızı gösterir. EEM tarafındaki 2.5V eşik yazılımda %50 doluluğa karşılık gelir. Böylece elektronik devre eşiği ile yazılım alarm eşiği aynı noktada birleşir.

Rota tarafında araçlar düz çizgiyle değil, kampüs için tanımlanmış yol ağı üzerinden ilerler. Birden fazla görevli seçildiğinde sistem görevleri dengeli dağıtır; yakın kutuları mümkün olduğunca aynı görevliye verir ve her görevlinin rotasını farklı renkle gösterir.
