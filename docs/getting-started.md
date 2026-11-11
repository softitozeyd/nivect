# Geliştirici başlangıç rehberi

PET şişe kalite kontrolü için ürün temeli: Türkçe web arayüzü, operatör oturumu,
PC kamera önizlemesi, yerel model servisi, kalıcı inceleme kayıtları ve MQTT adaptörü.

Güncel model, 10 Kasım 2026 tarihli YOLO11m eğitiminden alınmıştır. Kamera
önizlemesi ve kayıt yönetimi kullanılabilir. Model tabanlı tespit için
Git dışında saklanan `best.pt` dosyası gerekir.
Mevcut kapsam: `bottle`, `underfill`, `missing_cap`, `loose_cap`.
Etiket ve yabancı madde bu modelin kabul kapsamında değildir.

## Hızlı başlangıç

Gereksinimler: Docker Compose, Java **21 JDK**, Maven 3.9+, Node 22+, Python 3.12+.
Depo kökünde:

```bash
./scripts/setup-dev.sh       # eksik yerel değerleri üretir; mevcut .env korunur
./scripts/build.sh           # npm ci, frontend production build, Maven verify
python3 -m venv .venv
.venv/bin/pip install -r camera/requirements.lock
./scripts/dev.sh             # altyapı + yerel model servisi + backend
```

Uygulama ve API aynı origin üzerinde 8080 portunda sunulur. Giriş kullanıcısı
`operator`; parolası yalnızca yerel, Git'in yok saydığı `.env` içindeki
`QC_OPERATOR_PASSWORD` değeridir. Kamera adaptörü `camera` kullanıcısını ve ayrı
`QC_INGEST_PASSWORD` değerini kullanır. Parolaları commit etmeyin veya paylaşmayın.
`dev.sh` ön planda çalışır; Ctrl+C backend/model süreçlerini kapatır, Docker veri
volume'lerini korur. Önceden çalışan 8080/9000 servisleri varsa aynı servisi ikinci
kez başlatmayın.

Frontend geliştirme için ayrıca `cd frontend && npm run dev`; API istekleri
backend'e yönlendirilir. HMR yalnızca geliştirme sunucusunda bulunur.

Windows'ta `.env` üretmek/güncellemek için `scripts/setup-dev.ps1` kullanılabilir.
Tam uygulama için `docker compose --profile app up -d --build --wait --wait-timeout 180`.
Opsiyonel model servisi için ayrıca `-f compose.yaml -f compose.vision.yaml` ekleyin.

## PC kamerası ve gerçek tespit

1. Operasyon panelinde **Kamera → Kamerayı aç**. Tarayıcı kamera izni ister.
2. Model yüklenmemişse önizleme açılır; tespit kapalı kalır.
3. Güncel YOLO11m ağırlığını ekipten alıp `models/best.pt` yoluna koyun.
   SHA-256 değeri `6965529ce3d730b05446b483883f946c7b46723471b8311f73b7eb6c97cf3dbd`
   olmalıdır. Dosya 40.554.028 bayttır ve Ultralytics 8.4.203 ile eğitilmiştir.

```bash
.venv/bin/pip install -r camera/requirements-model.txt
QC_MODEL_PATH=models/best.pt .venv/bin/uvicorn camera.server:app --host 127.0.0.1 --port 9000
```

Docker kurulumunda `compose.vision.yaml` aynı dosyayı yerel `models/`
klasöründen bağlar. Servisin `/health` yanıtındaki `modelReady` alanı
yükleme durumunu gösterir.

Var olan model servisini önce durdurun. `QC_MODEL_PATH` servis başlatılırken okunur.
Torch CPU/GPU seçimi ve Ultralytics lisansı için [ürün rehberine](product.md) bakın.
Tarayıcıda model durumu yenilendikten sonra **Tespiti başlat** etkinleşir.
HTTPS veya localhost gerekir. Kamera açılınca görüntüler otomatik kaydedilmez;
yalnızca tespit açıkken JPEG kareler özel model servisine gönderilir.

Alternatif bağımsız adaptör:

```bash
# QC_INGEST_PASSWORD değerini güvenli yerel ortamdan sağlayın; CLI argümanına yazmayın.
.venv/bin/python -m camera.run --weights /absolute/path/best.pt --source 0
```

USB kamera `0`, video dosyası veya RTSP kaynağı desteklenir. İlk akış **tek şişe
kontrol alanı** içindir: beş gözlemden sonra tek olay; yeni şişe için beş boş gözlem.
Birden fazla şişede kontrol alanı boşalana kadar kayıt verilmez. Hızlı üretim bandı,
örtüşen şişeler ve PLC ayırıcı kontrolü henüz saha kabulünden geçmemiştir.

## Doğrulama

```bash
npm --prefix frontend test
python3 -m unittest discover -s tests -v
mvn -B -ntp verify
python3 scripts/test-product.py              # gerçek çalışan servisler gerekir
cd frontend && npm run test:e2e              # Chromium; örnek kamera simüle edilir
```

Yerelde Playwright ayarı `/usr/bin/chromium` kullanır; başka kurulum için
`CHROMIUM_PATH` verin. CI Playwright'ın kendi Chromium'unu kullanır.
`test-product.py` yalnızca kendi UUID'leriyle oluşturduğu kayıtları siler.
Arayüz testleri MANUAL kaynaklı test kayıtları bırakır; kamera KPI'larına karışmaz.

## Mimari ve kapsam

- React/Vite arayüzü build sırasında Spring Boot içine paketlenir.
- Oturum cookie'si HttpOnly/SameSite=Strict; yazma işlemlerinde CSRF kontrolü vardır.
- Operatör kayıtları okuyabilir; kamera hesabı yalnızca CAMERA olaylarını gönderebilir.
- PostgreSQL commit tamamlanmadan olay onaylanmaz. Aynı `eventId` tekrarı kayıt
  çoğaltmaz; farklı içerikle aynı kimlik HTTP 409 döner.
- MQTT QoS 1 mesajı commit sonrasında onaylanır. MQTT publisher ACK'i uygulama
  commit onayı değildir; güvenilir kamera tesliminde HTTP + SQLite outbox kullanılır.
- Redis eski altyapıyla uyum için korunmuştur; yeni kayıtlar geçici Redis List
  kuyruğuna yazılmaz. Eski listede bekleyen olay varsa silmeden önce dönüştürülmelidir.
- Flyway V1–V3 ile mevcut kayıtlar korunur ve `LEGACY` kaynağına ayrılır.
- Düşük güven / şişe bulunamaması `REVIEW`; PET kusuru `FAIL`; diğerleri `PASS`.
  PASS, modelin kapsamı dışında kalan kusurlar için güvence değildir.

[Ürün ve üretime geçiş rehberi](product.md) · [API sözleşmesi](api.md) ·
[Altyapı ayrıntıları](infrastructure.md) · [Model ve eğitim rehberi](product.md#training-and-model-promotion)

Mevcut not defterinin aynı çekim ortamında bildirdiği yüksek metrikler, yeni bir
kamerada veya üretim hattında doğruluk kanıtı değildir. Eğitim verisi ve model
bu depoda bulunmaz. Veri: `jihadakbr/water-bottle-defect-level-detection-dataset`.
Fiziksel şişe/çekim oturumu ayrımını zorlayan yeni eğitim girişi `training/train.py`.

## Birleştirilen önceki frontend

Tüm geliştirme dallarının geçmişi main altında korunur. Güncel Nivect arayüzü
`frontend/` dizinindedir. Önceki VisionQC demo arayüzü, Türkçe/İngilizce dil
seçenekleri ve kendi testleriyle [legacy/frontend](../legacy/frontend/) altında
saklanır. Bu ayrı paket güncel frontend build'ine dahil edilmez. Ayrıntılar:
[birleştirme notu](branch-integration.md).
