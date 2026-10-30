# Gerçek backend entegrasyon kontrolü — 30 Ekim 2026

Frontend Docker/Nginx üzerinden Spring Boot backend'e bağlandı. Backend,
PostgreSQL, Redis ve Mosquitto yerel Docker servisleriydi. `test-backend.ps1`
ile bir MQTT FAIL ve bir HTTP PASS test kaydı oluşturuldu; ikisinin PostgreSQL'e
yazıldığı, FAIL kaydının API'den ve panelden okunabildiği görüldü. Bunlar
gerçek model çıktısı veya üretim ölçümü değildir.

- Frontend API production build, ESLint ve 38 birim/bileşen testi geçti.
- `test-frontend.ps1` Windows PowerShell 5.1 ve PowerShell 7'de, HTML/health ve
  backend ile proxy üzerindeki hata kaydı alanlarının eşleşmesini doğruladı.
- Gerçek servisle Chromium'da altı sayfa, hata kaydı detayı, kapalı operatör
  düzenleme alanları, mobil viewport ve bağlantı hatasında demo verisine
  dönülmemesi kontrol edildi. `npm run test:live` ile tekrarlanabilir.
- Docker backend JVM UTC'ye ayarlandı; frontend varsayılan UTC yorumuyla
  İstanbul saatine dönüştürüyor. Mevcut örnek kayıtlar UTC Docker sürecinden
  geliyordu; başka ortamda üretilmiş eski kayıtların saat dilimi ayrıca
  doğrulanmalı. API'nin LocalDateTime alanı kendi saat dilimini taşımaz.

Bu entegrasyon son 20 FAIL kaydı ve backend sağlığı ile sınırlıdır. PASS ve
toplam üretim geçmişi, kamera/görsel, WebSocket ve gerçek model bağlantısı
mevcut API'de yoktur. Redis List tüketimi halen DB commit öncesi çıkarma yaptığı
için kesinti ve tekrar kayıt dayanıklılığı bu testle kanıtlanmış değildir.
