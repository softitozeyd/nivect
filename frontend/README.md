# VisionQC PET — Nivect frontend

Mevcut açık mavi VisionQC arayüzü, [softitozeyd/nivect](https://github.com/softitozeyd/nivect) projesine uyarlanmıştır. Referans commit: `31c9ce15d179b1f6664b5e4b61de45da4ebd5f00` (27 Ekim 2026 incelemesi). Backend **Spring Boot / Java 21**'dir; FastAPI varsayımı kaldırılmıştır. Ürün Ron 88 PET su şişesidir.

## Hazır demo

```sh
npm ci
npm run dev -- --port 5197 --strictPort
```

Demo varsayılandır; PostgreSQL, Redis, MQTT veya backend gerektirmez. Seed ve temsili şişe görseli `missing_cap`, `loose_cap`, `underfill` sınıflarına göre güncellenmiştir. Altı ekran ve operatör inceleme, filtreleme, sayfalama, grafikler, CSV, tercihler ve kesinti simülasyonu korunur. Tüm demo verileri etiketlidir. En fazla 500 oturum kaydı tutulur; değerlendirmeler yenilemede sıfırlanır.

## Nivect backend ile çalışma

Backend hazırken (varsayılan `http://127.0.0.1:8080`):

```sh
npm run dev:api -- --port 5198 --strictPort
```

Bu komut dosya düzenleme veya .env oluşturmadan API modunu açar. Tarayıcı aynı origin'e GET gönderir; Vite `/api` ve `/actuator/health` isteklerini 8080'e proxy eder. Şifreler veya veritabanı/MQTT/Redis bilgileri frontend'e girilmez.

Doğrulanan okumalar:

- `GET /api/v1/inspections/failures`: En son 20 FAIL kaydı.
- `GET /actuator/health`: Backend sağlık yanıtı.

Bu API PASS kayıtları, toplam üretim, gerçek hata oranı, FPS, kamera/istasyon sağlığı, model güveni/sürümü veya görüntü indirme uç noktası sağlamaz. Bu alanlar API modunda “—” / “Sağlanmıyor” gösterilir. Sadece hata kayıtlarından %100 hata veya %0 uygunluk çıkarılmaz. Çoklu kusurlar ve üç kontrol bayrağı ayrı tutulur. `capOk=false`, eksik/gevşek kapak ayrımı yapmaya yetmez. `imagePath` sunucu metaverisidir, otomatik URL'ye çevrilmez.

Java `LocalDateTime` saat dilimi taşımıyor. İstemci varsayılan olarak backend saatinin **UTC+3** olduğunu varsayar; bu varsayım sunucu ekibiyle doğrulanmalıdır. `config.example` gizli olmayan ayarları belgeler; `VITE_BACKEND_UTC_OFFSET=Z` veya `+03:00` ile değiştirilebilir. Tarihler UTC'ye normalleştirilir; kullanıcı gösterim tercihi İstanbul/UTC'dir. Tarih filtrelerinin gün sınırları İstanbul'dur.

API hatası demo verisiyle gizlenmez. Gerçek operatör kayıt yazımı, kamera ayarı ve model güncellemesi mevcut backend tarafından desteklenmediği için kapalıdır. `POST /api/v1/inspections` edge/model veri alımı içindir; frontend bu uç noktaya üretim kaydı göndermez.

## Nivect deposuna ekleme

Bu klasör `nivect/frontend/` olarak yerleştirilebilir; Java kaynakları değişmez. `compose.frontend.yaml` dosyasını depo köküne koyun. Mevcut backend Compose hazırlandıktan sonra:

```sh
docker compose -f compose.yaml -f compose.frontend.yaml --profile app up -d --build
```

Frontend localhost:5197, backend localhost:8080. Nginx yalnızca iki onaylı GET yolunu backend'e proxy eder, React rotalarına index.html fallback sağlar. Bu turda Docker motoru kapalı olduğundan Docker imajı ve gerçek backend bağlantısı çalıştırılarak doğrulanamadı; frontend derlemeleri ve sözleşme/proxy testleri ayrı doğrulanmıştır. Mevcut backend dosyaları değiştirilmedi, GitHub'a yazılmadı.

## Kontroller

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run build:api
npx playwright install chromium
npm run test:e2e
```

E2E gerçek fabrika verisi yazmaz. Demo 5197, API frontend 5198 ve salt okunur sözleşme fixture'ı 18080 portlarında test edilir. Mock HTTP yanıtları Java entity/controller ile eşlenir; gerçek Spring/DB/MQTT entegrasyonu yerine geçmez.

[Güncel API sözleşmesi](docs/api-contract.md) · [Entegrasyon kılavuzu](docs/integration-guide.md) · [Test raporu](docs/test-report.md) · [Nivect uyarlaması](docs/nivect-adaptation.md)
