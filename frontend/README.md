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

Java `LocalDateTime` saat dilimi taşımıyor. Docker backend JVM saati UTC olarak ayarlanmıştır; API modu varsayılan olarak `Z` uygular. Geçmiş kayıtlar farklı saat diliminde yazıldıysa hangi zaman diliminde oldukları ayrıca doğrulanmalıdır. IDE veya başka sunucudaki backend için farklı offset gerekiyorsa yerel Vite çalıştırması/derlemesi sırasında `VITE_BACKEND_UTC_OFFSET` ayarlanır. Docker frontend varsayılan UTC backend için hazırlanır. Tarihler UTC'ye normalleştirilir; kullanıcı gösterim tercihi İstanbul/UTC'dir. Tarih filtrelerinin gün sınırları İstanbul'dur.

API hatası demo verisiyle gizlenmez. Gerçek operatör kayıt yazımı, kamera ayarı ve model güncellemesi mevcut backend tarafından desteklenmediği için kapalıdır. `POST /api/v1/inspections` edge/model veri alımı içindir; frontend bu uç noktaya üretim kaydı göndermez.

## Nivect deposuna ekleme

Bu klasör `nivect/frontend/` olarak yerleştirilebilir; Java kaynakları değişmez. `compose.frontend.yaml` dosyasını depo köküne koyun. Mevcut backend Compose hazırlandıktan sonra:

```sh
docker compose -f compose.yaml -f compose.frontend.yaml --profile app up -d --build
```

Frontend localhost:5197, backend localhost:8080. Nginx yalnızca iki onaylı GET yolunu backend'e proxy eder, React rotalarına index.html fallback sağlar. Gerçek model ve kamera entegrasyonu bu akışın dışındadır.

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

Gerçek Docker backend ve frontend açıkken tarayıcı ile salt okunur kontrol:

```sh
npm run test:live
```

Bu test mevcut kayıtları okur, yeni kayıt oluşturmaz. Liste boşsa kayıt detayı
kontrolünü atladığını bildirir. Varsayılan adres `http://127.0.0.1:5197`;
başka adres için `LIVE_API_URL` kullanılabilir.

E2E gerçek fabrika verisi yazmaz. Demo 5197, API frontend 5198 ve salt okunur sözleşme fixture'ı 18080 portlarında test edilir. Mock HTTP yanıtları Java entity/controller ile eşlenir; gerçek Spring/DB/MQTT entegrasyonu yerine geçmez.

[Güncel API sözleşmesi](docs/api-contract.md) · [Entegrasyon kılavuzu](docs/integration-guide.md) · [Gerçek backend kontrolü](docs/live-integration-validation.md) · [Önceki test raporu](docs/test-report.md)
