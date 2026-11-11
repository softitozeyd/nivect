# Test raporu — Nivect uyarlaması (27 Ekim 2026)

Referans backend: softitozeyd/nivect @ 31c9ce15d179b1f6664b5e4b61de45da4ebd5f00. Yerel frontend mevcut tasarımı korunarak uyarlandı. GitHub'a yazım/push yok.

| Gerçekte çalıştırılan kontrol              | Sonuç                                                                |
| ------------------------------------------ | -------------------------------------------------------------------- |
| npm run typecheck                          | Başarılı; uygulama, unit/e2e ve ayarlar dahil                        |
| npm run lint                               | Başarılı                                                             |
| npm test                                   | 5 dosyada 35/35 başarılı                                             |
| npm run build                              | Başarılı, demo production build                                      |
| npm run build:api                          | Başarılı; son zaman metaverisi değişikliğinden sonra tekrar başarılı |
| npm run test:e2e                           | Tam koşuda 21/21: 13 demo + 8 Nivect sözleşme/API/proxy              |
| npm run test:e2e -- --project=api-contract | Son zaman metaverisi değişikliğinden sonra 8/8 tekrar başarılı       |

Birim testleri: mevcut metrik/filtre/tarih/CSV/operatör/demo/cleanup kapsamına ek olarak gerçek Nivect alan eşlemesi, çoklu false kontrolleri, LocalDateTime ve nanosaniye normalizasyonu, geçersiz saat farkı, bozuk/tekrarlı/20 üzeri kayıt, tutarsız FAIL, GET retry/4xx/iptal, eksik veya DOWN health ve gerçek review yazımının engellenmesi.

Tarayıcı testleri: mevcut altı rota ve demo iş akışları, bağlantı kesintisi/geri dönüş, onay/vazgeçme ve üç operatör kararı, CSV, kuyruk/tarih/istasyon filtreleri, sayfalama, otomatik kayıt ve pause/resume. Nivect tarafında gerçek failures/health yolları, ham kontrol sonuçları ve sunucu imagePath metaverisi, birden fazla kusur, yalnızca hata verisinden toplam/oran/FPS üretmeme, boş/bozuk API yanıtı, health DOWN, bekleyen istekte stale gösterimi, proxy üzerinden gerçek HTTP okuması test edildi.

Proxy testi: Playwright API frontend'i 5198 portunda, salt okunur test fixture'ı 18080 portunda çalıştırır. Tarayıcı same-origin GET isteği yapar; Vite bunu fixture'a HTTP ile iletir. Fixture Java controller/entity sözleşmesini temsil eder; gerçek Spring Boot/PostgreSQL/Redis/MQTT başarı iddiası değildir. Testler üretim verisi yazmaz. Test sunucuları koşu sonunda kapanır.

Responsive: demo ve API modlarındaki altı ekran 1440/1024/768/390 genişliklerinde taşma kontrolünden geçti. API ve demo için altı ekranın Axe WCAG2 A/AA ve WCAG2.1 AA taramaları başarılı. API zaman metaverisi düzenlemesi sonrası tüm API grubunun taraması tekrar geçti. Tam koşu yaklaşık iki dakika, son API grubu yaklaşık 53 saniye sürdü. HTML raporu playwright-report/ son API grubunu gösterir.

Görsel QA: API 1440/390 ekran görüntüleri araçla açılıp incelendi. `docs/screenshots/nivect-api-fixture-*.png` kontrollü fixture verisidir, gerçek fabrika ölçümü değildir. `nivect-pet-demo.png` açık tarayıcıdan kaydedilen özgün temsili Ron 88 PET simülasyonudur. Kullanıcının açık tarayıcında Ron 88 demo ürünü ve izleme ekranı ayrıca doğrulandı.

Gerçek bağlantı sınırı: Docker CLI var, Docker motoru kapalı. localhost:8080 health/failures erişilemiyordu. Bu yüzden gerçek backend/DB/MQTT ve Docker build/up doğrulanamadı. Backend timezone da çalışma ortamından doğrulanamadı; +03:00 varsayımı UI'da ve config/README'de açık, orijinal zaman değeri detay/CSV'de saklıdır. Manuel ekran okuyucu ve fabrika model başarımı doğrulaması yapılmadı.

Ayrıntı ve sonraki ekip adımı: [Nivect uyarlaması](nivect-adaptation.md). Sonraki adım gerçek backend açıldığında iki salt okunur endpoint ile canlı bağlantıyı ve backend zaman farkını doğrulamaktır. Gerçek review, toplam/PASS, görüntü ve telemetry kaynakları backend desteği bekler.

## English UI update — 27 October 2026

All six screens, demo records, API status/errors, dialogs, notifications, accessibility labels, chart labels, and CSV download filenames now use English. HTML language is en; dates and numbers use en-US with the selected time zone preserved. Percent signs follow values. TypeScript, ESLint, 35 unit tests, both builds, and the full 21-test browser suite passed after translation. Responsive demo checks also verify English document language and the absence of Turkish characters in rendered UI. The final percentage formatting is additionally checked through the focused dashboard/responsive browser tests.

## Repository audit — 27 October 2026

Final audit: 38/38 unit tests and 23/23 Playwright tests pass. Typecheck, ESLint, demo and API production builds pass. Four regressions were reproduced before fixes: constituent-defect filtering/search, automatic polling cancelling a manual retry, stale backend health remaining green, and a misspelled fixture cache header. Production demo smoke passed twelve desktop/mobile deep-link checks, operator review persistence within the session, and unknown-route fallback. Dependency audit reported zero vulnerabilities. Real backend/database and Docker/Nginx execution remain blocked. Full English assessment: [repository-audit.md](repository-audit.md). Production measurements: [qa-production-smoke.json](qa-production-smoke.json).
