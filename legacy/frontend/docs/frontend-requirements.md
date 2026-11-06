# Güncel frontend gereksinimleri — Nivect

27 Ekim 2026: Kullanıcının yeni referansı softitozeyd/nivect deposudur. Önceki PDF bu oturumda hâlâ erişilebilir değildir; eski gereksinim metnindeki FastAPI/kozmetik ürün varsayımları yeni kaynak kodla güncellenmiştir. Görsel referansa göre uygulanmış açık mavi arayüz ve tüm operatör ekranları korunur.

CONFIRMED: Spring Boot Java 21, PostgreSQL/Redis/MQTT; Ron 88 PET v1 model sınıfları bottle/underfill/missing_cap/loose_cap. Backend controller kalite kontrollerini capOk/labelOk/liquidLevelOk boolean'ları olarak tutar. Dashboard için yalnızca son 20 FAIL kaydı sunulur. Backend model alt sınıfı, confidence veya station kimliği sağlamaz. Etiket kontrolü model kapsamı için ekip kararı gerektirir; frontend ham alanı gösterir, modelin etiketleri doğruladığını iddia etmez.

Ekranlar: Genel Bakış, Canlı İzleme, Hata Geçmişi, İstasyonlar, Raporlar, Ayarlar; olay detayında operatör demo inceleme/onay/not. Gerçek modda desteklenmeyen mutasyonlar kapalı. Eksik ölçümler sıfır veya sağlıklı kabul edilmez. API hatası demo ile gizlenmez. Filtre/pagination sadece eldeki son 20 FAIL üzerinde yereldir.

Varsayımlar: Demo iki kamera ve line-1 hattında çalışır, tamamen simüledir. Model demo sürümü gerçek model build kimliği değildir. Backend saat dilimsiz LocalDateTime için varsayılan UTC+3 açıkça belirtilir ve sunucu ekibince teyit edilmelidir. imagePath bir erişim endpoint'i değildir. Kamera akışı, auth ve tam üretim raporu gerçek backend desteği bekler.

Backend dışı kapsam: üretim makinesi/PLC kontrolü, model eğitimi, Redis/MQTT parola yönetimi, veri kaybı dayanıklılığı ve fabrika doğrulaması frontend tarafından yapılmaz. Gelecek model işleri farklı ışık/arka plan, fazla dolum ve eğik/yüksek kapak örnekleridir.
