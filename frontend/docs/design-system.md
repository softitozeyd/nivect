# Tasarım sistemi

25 Ekim 2026 görsel yenilemesi: Kullanıcının paylaştığı ekran görüntüsünden hareketle açık mavi geçişli çalışma yüzeyi, üstte yatay kapsül menü, açık kartlar ve cyan vurgu uygulanmıştır. Mevcut ekranlar, alanlar ve iş akışları korunur. Yeni görünüm src/styles/refresh.css içinde ortak bileşen stillerinin üstüne uygulanır; uygulama veya veri katmanı yeniden kurulmadı.

Renkler: arka plan #dceaf7 → #d2e5f6 → #e4eff9; kart #f9fcff; başlık #17263c; seçili menü #102137; grafik ve metrik vurgusu #0da7e3. Başarı mint, hata pembe/kırmızı, uyarı amber rozetlerle ve açık durum metniyle gösterilir. Küçük metinlerin kontrastı Axe ile doğrulanır. Fontlar yerel DM Sans ve Manrope; dış font servisi gerekmez.

Kart köşeleri 17–20px, yumuşak mavi gölgeler, 16–22px panel aralıkları, 4/8 tabanlı boşluklar. Başlık 28–31px, panel başlığı 13–14px, veri metni 10–12px. Klavye focus 3px mavi outline. Native dialog odak ve Escape davranışını korur. Reduced-motion tercihi desteklenir.

Navigasyon masaüstünde marka ile eylemler arasında yataydır. 1120px altında ikinci satıra geçer; 600px altında açılır menü olur ve Escape ile kapanır. 1440/1024/768/390px ekranlar test edilir. Tablolar kendi kabında yatay kaydırılır; alanlar gizlenmez. Önizleme mobilde de erişilebilir.

Genel bakış: dört temel metrik, ürün/hat/bağlantı ve güncelleme bilgisi; AI inceleme tablosu ve işlevsel Tümü/Bekleyen/Hatalı/Uygun filtreleri; uygun AI tahmini oranının dairesel özeti; aktivite grafiği; istasyon sağlığı, değerlendirme bekleyen olaylar ve temsili kamera önizlemesi. Eski çalışma alanı/oturum bilgileri sayfa altındaki açılır bilgi alanında korunur.

Dairesel yüzde gerçek model doğruluğu değildir. Alınan kayıtlardaki pass kararlarının oranıdır ve açıklaması kartta gösterilir. Referans görseldeki doğrulanmamış precision/recall, drift ve yeniden eğitim işlemleri uydurulmadı. Operatörün inceleme işlemi mevcut onay akışını açar; makineye komut göndermez.
