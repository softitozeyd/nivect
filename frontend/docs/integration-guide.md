# Nivect entegrasyon kılavuzu

Kaynak ve sözleşme: docs/api-contract.md. Backend port 8080, Spring Boot Java 21. Frontend mevcut tasarımı korur; Java/Redis/MQTT/PostgreSQL kodu değiştirilmez.

## Yerel çalışma

Demo: `npm run dev -- --port 5197 --strictPort`. API: `npm run dev:api -- --port 5198 --strictPort`. Ek bir .env veya el ile kod değişikliği gerekmez. Vite aynı origin proxy kullanır; varsayılan backend hedefi 127.0.0.1:8080. Başka port için `VITE_BACKEND_TARGET` işlem ortamında ayarlanır. Tarayıcıya secret verilmez.

`VITE_API_BASE_URL` boş olunca same-origin proxy kullanılır. Doğrudan başka origin seçilirse backend CORS izinlerini ekip ayarlamalıdır; mevcut backend CORS sunmadığı için varsayılan proxy bu ihtiyacı kaldırır. Frontend gerçek API isteği başarısız olursa demo verisine geçmez.

`VITE_BACKEND_UTC_OFFSET` backend'in saat dilimsiz LocalDateTime değerine uygulanır. Docker backend JVM UTC kullanır, frontend varsayılanı Z'dir. Yerel Vite çalıştırması/derlemesi farklı bir sunucuya bağlanacaksa offset ortam değişkeniyle ayarlanabilir; Docker frontend varsayılan UTC backend için derlenir. Başka ortamda çalışan backend ve eski kayıtlar için offset ayrıca doğrulanmalıdır. Model confidence ve model version alanları gönderilmediği için yok gösterilir. Dosya imagePath değerleri otomatik URL veya yerel dosya erişimine çevrilmez.

## Monorepo / Docker

Frontend'i `frontend/` klasöründe tutun. `frontend/compose.frontend.yaml` dosyası depo kökünde `compose.frontend.yaml` olarak kullanılır. Mevcut compose.yaml korunur. Backend ortamı kendi ekip kurulumuyla hazırlandıktan sonra `docker compose -f compose.yaml -f compose.frontend.yaml --profile app up -d --build`.

Nginx backend:8080 adresine yalnızca GET failures ve health isteklerini iletir. SPA deep-link fallback hazır. API modu build: `npm run build:api`. Container sadece localhost:5197'ye bağlanır. Auth eklenene kadar bu paket üretim/LAN/Internet yayını sayılmaz.

## Eksik backend kaynakları

Bu sürümde yalnızca son 20 FAIL kaydı vardır. PASS/toplam olmadığı için üretim hata oranı hesaplanamaz. Station health ve model health üretilemez. Tüm alanlar UI'da “Sağlanmıyor” veya açık açıklamayla korunur. Operatör değerlendirmeleri demo oturumunda çalışır, API modunda yazım kapalıdır. Backend'e doğrudan kalite kaydı/PLC komutu gönderilmez.

Sonraki ortak işler: gerçek sözleşmede idempotent edge event kimliği, model alt sınıfları/confidence/modelVersion/stationId, UTC offsetli zaman, yetkili görüntü endpoint'i, summary/PASS arşivi, server pagination, auditli review/auth. webcam_test.py şu an backend'e veri göndermez; model→MQTT/HTTP bağlantısı frontend'in dışında kalan ekip işidir.
