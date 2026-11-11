# VisionQC entegrasyonu

Panel, aynı depodaki backend ve yerel kamera servisiyle çalışır. Başlatma,
model kurulumu ve portlar için [ana kurulum rehberine](../../README.md) bakın.

Ön yüz geliştirme ortamında `npm run dev:api -- --port 5197 --strictPort`
komutu, `/api` ve sağlık isteklerini varsayılan olarak yerel backend'e iletir.
Kamera servisi yalnızca localhost üzerinde çalışır. Kamera deneyinde kayıt,
kullanıcı kaydı başlatana kadar kapalıdır.
