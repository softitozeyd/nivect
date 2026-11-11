# Nivect uyarlaması — 27 Ekim 2026

Referans: softitozeyd/nivect, commit `31c9ce15d179b1f6664b5e4b61de45da4ebd5f00`. GitHub bağlantısı yalnızca kaynak okumak için kullanıldı; uzak depoya hiçbir dosya/commit/PR gönderilmedi. Mevcut yerel açık mavi frontend üzerinde çalışıldı.

## İncelenen gerçek kaynaklar

README, pom.xml, compose.yaml, application.yml; BottleInspectionController/Dto/Entity/Repository/ServiceImpl; worker ve MQTT config; backend test betiği ve Java service testleri; webcam_test.py ve altyapı belgesi. Depoda frontend klasörü veya frontend için AGENTS.md bulunmadı.

## Yapılan uyarlamalar

- Eski varsayımsal FastAPI snapshot/review yolları kaldırıldı; Spring Boot GET failures ve actuator health adaptörü yazıldı.
- Ürün Ron 88 PET su şişesi oldu. Demo: eksik kapak, gevşek kapak ve düşük dolum; temsili PET şişe çizimi güncellendi. Altı ekran ve mevcut iş akışları korundu.
- Backend boolean kapak/etiket/dolum kontrolleri kayıpsız eşlendi. Aynı şişedeki çoklu kusurlar ayrıntı ve CSV'de korunur. capOk=false eksik veya gevşek diye ayrıştırılmadı.
- Son 20 FAIL kapsamı açıkça etiketlendi. Toplam üretim ve PASS verilmediğinden üretim hata/uygunluk oranı gösterilmez. Confidence, FPS, kamera/heartbeat/model sürümü uydurulmaz.
- API modunda izleme hat bazında son hatalı kayıttır; canlı kamera/video olduğu iddia edilmez. Raporlar hat bazında hata kaydı karşılaştırır.
- imagePath salt metaveridir. Yerel sunucu dosyası keyfi URL'ye çevrilmez ve tarayıcıda otomatik açılmaz.
- Java LocalDateTime → UTC normalizasyonu eklendi. Varsayılan server UTC+3 varsayımı arayüz, config ve belgede belirtilir. Orijinal nanosaniyeli değer ve uygulanan offset detay/CSV içinde korunur.
- GET timeout/retry/iptal, hata görünümü, eksik sağlık bilgisi ve stale-data davranışı doğrulandı. Operatör review yazımı mevcut backend'de olmadığı için gerçek modda kapalıdır.
- npm dev:api/build:api, same-origin Vite proxy, frontend Dockerfile/Nginx ve compose eklentisi hazırlandı. Backend kaynakları değiştirilmedi.

## Doğrulama

35 birim/bileşen testi ve tam koşuda 21 Playwright testi geçti. Demo: 13, Nivect sözleşme/API/proxy: 8 senaryo. TypeScript, ESLint, demo ve API production build geçti. Ekranlar demo ve API modlarında 1440/1024/768/390 genişliklerinde; Axe WCAG2 A/AA ve 2.1 AA ile test edildi. Kontrollü fixture üzerinden gerçek HTTP/Vite proxy okuması da denendi.

Tam testlerden sonra kaynak zamanının detay/CSV'de korunması ve varsayım etiketleri eklenerek ilgili API grubu ve birim/statik kontroller tekrar çalıştırıldı; son sonuç docs/test-report.md içinde.

## Doğrulanamayan sınır

Docker CLI mevcut ancak Docker motoru kapalı; localhost:8080 backend erişilemiyordu. Bu nedenle gerçek Spring Boot/PostgreSQL/Redis/MQTT uçtan uca bağlantısı ve Docker imajı build/up deneyi yapılmadı. Test fixture'ı gerçek fabrika sistemi değildir. Model webcam_test.py de kaynakta backend'e veri göndermiyor; bu edge/model ekip işidir. Saha başarımı/recall/yanlış ret oranı gösterilmez.

## Hazır teslim

Frontend kaynakları `outputs/visionqc` içinde güncellendi. Dağıtım paketi `frontend/` klasör yapısına uygundur; Compose eklentisi depo köküne konur. Yerel demo: http://127.0.0.1:5197/. Gerçek API modu backend hazır olduğunda npm run dev:api ile açılır.
