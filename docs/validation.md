# Doğrulama kaydı — 6 Kasım 2026

Bu kayıt mevcut izole bulut makinesindeki sonuçları belirtir. Üretim kabulü,
model doğruluğu, fiziksel kamera doğrulaması veya yeni snapshot restorasyonu
iddiası değildir.

| Kontrol | Gerçekleşen sonuç |
| --- | --- |
| Java 21 / Spring Boot 3.5.16 Maven verify | 5 test geçti; hata/atlanan yok |
| Python kamera, outbox, model-yok ve eğitim veri ayrımı | 6 test geçti; atlanan yok |
| Tarayıcı şişe geçiş mantığı (Node) | 2 test geçti |
| Chromium — Docker içinden sunulan gerçek uygulama | 3 test geçti: masaüstü/mobil, video kontrolü, oturum/kayıt/CSV/kamera önizleme, azaltılmış hareket |
| Gerçek API / PostgreSQL / MQTT entegrasyonu | Giriş/çıkış, CSRF, rol ayrımı, doğrulama, REVIEW, PASS/FAIL, eşzamanlı tekilleştirme, 409 çakışma, filtre/CSV/sayfalama ve MQTT kayıt kontrolü geçti |
| Boş PostgreSQL veritabanı | Ayrı geçici DB'de gerçek JAR V1–V3 geçişlerini uyguladı; sağlık UP; geçici DB kaldırıldı |
| PostgreSQL kesintisi ve kurtarma | 503; SQLite outbox korundu; aynı olay geri geldiğinde tek kayıt; test kaydı temizlendi |
| Kurulum tekrarı | Kaydedilen tam install_script çalıştırıldı; mevcut .env korundu |
| Başlatma betiği | scripts/dev.sh ile model servisi ve sabit JAR kopyası başladı; sağlık ve gerçek API kontrolleri geçti |
| Dağıtım | Çok aşamalı Docker build geçti; backend, PostgreSQL, Redis, Mosquitto healthy; app UID 10001 |
| Video sunumu | Sessiz H.264 klipler; posterler; Range GET 206; gerçek Chromium'da oynatma/duraklatma |
| npm audit | Tüm frontend bağımlılıkları için bildirilen açık sayısı 0 |
| Python bağımlılık tutarlılığı | pip check: bozuk gereksinim yok; CPU Torch/OpenCV/Ultralytics import edildi |
| Eski Redis listesi | Bu makinede bekleyen eski kayıt sayısı 0 |
| PostgreSQL yedeği | Özel arşiv üretildi, pg_restore --list doğrulandı; tam geri yükleme tatbikatı yapılmadı |

Kamera önizleme testinde Chromium'un simüle edilmiş kamerası kullanıldı. Fiziksel
PC kamerası bulut makinesinden doğrulanmadı. Model dosyası bulunmadığı için gerçek
YOLO çıkarımı, eğitim, GPU, kusur doğruluğu ve hat hızı ölçümü yapılmadı.
Opsiyonel ağır model Docker imajı oluşturulmadı; yerel CPU çalışma zamanı kuruldu.
CI iş akışı eklendi; uzak GitHub Actions çalışması bu kaydın kapsamında değildir.

Geliştirme ve Docker tarayıcı testlerinin MANUAL kayıtları bilerek ayrı kaynakta
saklanır. Kamera KPI'larına karışmazlar. API entegrasyon testleri yalnızca kendi
UUID'lerini temizler. Tarihsel LEGACY kayıtlar korunmuştur.

Görsel revizyon: ilk 3D sahne ve Three.js kaldırıldı. Kullanıcının seçme yetkisi
verdiği beş klipten dördü PET kapsamına uygun bulundu. İzin verilen filigran
bölgeleri temizlendi; bu bölgelerde ayrıntı yumuşaması mümkündür. Medya eğitim
verisi veya model çıktısı olarak kullanılmaz.

Kurulum ve başlangıç talimatları ortam yapılandırma taslağına kaydedildi. Bu,
yayınlama veya yeni bir görevde snapshot restorasyonu doğrulaması değildir.
Üretime geçişte kalan işler için [ürün rehberine](product.md) bakın.

## Buton ve kontrol tasarımı revizyonu

Kullanıcının yeni MOV referansına göre ortak Action/SelectControl bileşenleri ve
kontrol tema katmanı eklendi. Renkler referans kareden örneklendi: #171513 ve
#fa7013. CTA, menü, bağlantı, ikon butonu, açılır filtre, seçim kutusu ve kaydırıcı
aynı görsel dile taşındı. Ayrıntılar [kontrol rehberinde](controls.md).

Güncel Docker imajı yeniden oluşturulup çalıştırıldı; dört servis healthy.
Paketlenmiş uygulamada 4 Chromium testi geçti: mevcut mobil/kamera/kayıt/CSV
akışlarına ek olarak referans geçişi, ölçülerin sabit kalması, klavye aktivasyonu,
filtre kontrastı ve checkbox/range klavye davranışı doğrulandı. Bu revizyon önceki
satırdaki 3 tarayıcı testi kapsamını 4 teste genişletir.

## Kurumsal README ve ürün turu

README, uygulamanın logosu, açık/koyu logo varyantları, yeşil/adaçayı/krem kapak,
gerçek ürün ekranları ve video posteriyle yenilendi. Önceki ayrıntılı kurulum
talimatları [başlangıç rehberinde](getting-started.md) korundu. Turuncu kontrol
rengi sonraki tema revizyonunda yeşil ve adaçayıyla değiştirildi; videodaki çalışan
arayüz bu güncel paleti kullanır.

- Ürün turu: **86,06 saniye**, 1920 × 1080, 24 fps, H.264 / AAC; yaklaşık 5 MB.
- Türkçe ekran açıklamaları, seçilebilir Türkçe altyazı ve 10 bölüm işareti var.
- FFmpeg, video ve sesin tamamını hatasız çözdü.
- Chromium'da oynatma ilerledi; 3, 38, 74 ve 83. saniyelere atlama doğrulandı.
- README ve yeni rehberlerdeki 43 yerel bağlantı/görsel hedefi bulundu; SVG'ler
  XML olarak ayrıştırıldı. Markdown biçimi ve `git diff --check` geçti.
- Gerçek uygulamada oturum, kamera önizlemesi, manuel kayıt, filtre, ayrıntı ve
  CSV akışları kaydedildi. Yalnızca bu tur için oluşturulan üç MANUAL kayıt,
  kendi kesin olay kimlikleriyle silindi; veritabanı `DELETE 3` bildirdi.

Önizleme, kayıtlı PET videosunun tarayıcı test kamerasına verilmesiyle yapıldı.
Model dosyası bulunmadığından gerçek çıkarım çalıştırılmadı. Video bu sınırları
ekranda belirtir; fiziksel kamera veya üretim başarısı iddiası içermez.
Bu dokümantasyon/medya değişikliği için uygulama test paketleri yeniden çalıştırılmadı.
