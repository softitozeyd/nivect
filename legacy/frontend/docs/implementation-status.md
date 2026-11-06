# Uygulama ilerleme kaydı

25 Ekim 2026, İstanbul saati. Mevcut hedef: yerel, bağımsız ve işlevsel frontend demosu.

Tamamlandı: gereksinim metni incelemesi, boş çalışma alanı keşfi, React/TypeScript/Vite kurulumu, strict tipler, Router, tasarım sistemi, altı modül, demo adaptörü, önerilen API adaptörü, hata durumları, operatör inceleme/onay, CSV, responsive davranış ve dokümantasyon.

Doğrulandı: 15 birim/bileşen testi, 9 Playwright testi, ESLint, TypeScript, production build. Tarayıcı testleri tüm modülleri, filtreleri, sayfalamayı, canlı olay gelişini, bağlantı kesintisi/geri yüklemeyi, operatör onayını, tercihlerinin saklanmasını, CSV indirmeyi ve klavye/Escape davranışını kapsar. Ayrıntılar test-report.md içinde.

Görsel kontrol: 1440/1024/768/390 ekran görüntüleri üretildi; 1440/1024/390 görüntüleri araçla açılıp incelendi. Mobil taşma ve düşük kontrast sorunları düzeltildi. Axe WCAG 2 A/AA ve 2.1 AA otomatik kontrolleri tüm ekranlar ve olay modalında uygulandı.

Entegrasyon bağımlılıkları: PDF eki, gerçek FastAPI/OpenAPI, auth/authorization, yetkili görüntü kaynağı ve gerçek fabrika verileri yok. Bunlar demoyu engellemez; gerçek saha teslimi ve PDF ile birebir uyum henüz doğrulanamaz. OCR Faz 2. API yolları PROPOSED olarak işaretli.

Kararlar: bağımsız proje outputs/visionqc; GitHub ve harici servis bağlantısı yok. Tek hat, iki istasyon, özgün temsili şişe SVG'si, 500 kayıt sınırı, İstanbul saat dilimi. Değerlendirmeler oturumluk, tercihler tarayıcıda. Polling bir okuma tamamlandıktan sonra yeniden planlanır; unmount veya bağlantı değişiminde iptal edilir.

Bilinen kritik demo hatası: yok. İzlenecek gelecek işler: gerçek backend sözleşmesine uyarlama, tam arşiv için sunucu filtre/sayfalama, model doğrulama verileri ve güvenlik/saha testleri.

## 25 Ekim 2026 — stabilizasyon turu

Mevcut proje yerinde incelendi ve düzeltildi. Yeni sonuçlar: 27 birim/bileşen testi ve 16 Playwright testi (12 demo, 4 kontrollü API modu senaryosu); TypeScript, ESLint ve production build başarılı. TypeScript kapsamına e2e testleri de eklendi. Ayrıntılı bulgular, düzeltilen hatalar, referans eksikleri ve sonraki işler `stabilization-report.md` içinde. Önceki 15/9 sonuçları ilk teslim turuna aittir. Gerçek backend ve PDF doğrulaması halen bekliyor.

## Görsel referansa göre arayüz yenilemesi

25 Ekim 2026: Kullanıcının paylaştığı ekran görüntüsüne benzer açık mavi/cyan arayüz, yatay üst menü ve yuvarlatılmış kartlar uygulandı. Tüm altı rota, metrikler, filtreler, CSV, operatör değerlendirmesi, saat/bağlantı bilgisi ve kamera önizlemesi korundu. Genel bakışta işlevsel kuyruk filtreleri ve uygun AI tahmini oranı kartı eklendi. Bu oran model doğruluğu olarak sunulmaz. Çalışma alanı açıklamaları footer bilgi alanına taşındı. Görsel değişiklik veri adaptörlerini veya backend sözleşmesini değiştirmedi.

Görsel yenileme test sonucu: 27 birim/bileşen ve 17 tarayıcı testi başarılı. TypeScript/lint/build temiz. Masaüstü ve mobil görseller incelendi, kontrast düzeltmeleri doğrulandı. Aynı yerel sunucu ve proje kullanılıyor.

## 27 Ekim 2026 — Nivect deposuna uyarlama

Gerçek kaynak: softitozeyd/nivect @ 31c9ce15d179b1f6664b5e4b61de45da4ebd5f00. Spring Boot / Ron 88 PET desteği eklendi. Önceki önerilen snapshot API yerine onaylı failures/health yolları kullanılıyor. Demo ve altı ekran korundu, API-only eksik metrikler uydurulmadan etiketlendi. 35 birim testi, tam koşuda 21 e2e testi; TypeScript/lint/demo+API build başarılı. Son zaman metaverisi değişikliği için API grubu tekrar kontrol edildi. Ayrıntılar nivect-adaptation.md ve güncel test-report.md içinde. Docker motoru kapalı olduğundan gerçek backend/Docker çalışma testi yapılamadı. GitHub'a push veya backend dosya değişikliği yapılmadı. Önceki tarihli test sonuçları tarihçedir.
