# VisionQC PET: Ron 88 şişe kusur tespiti (v1)

## Backend gelistirme altyapisi

PostgreSQL, Redis ve Mosquitto yerel kurulumu icin [altyapi rehberi](docs/infrastructure.md).
Spring Boot backend'i altyapiyla birlikte baslatmak ve test etmek icin:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/setup-dev.ps1
docker compose --profile app up -d --build --wait --wait-timeout 180
powershell -ExecutionPolicy Bypass -File ./scripts/test-backend.ps1
```

Backend varsayilan olarak `http://localhost:8080` adresindedir. Parolalar yerel
`.env` dosyasindan alinir ve Docker imajina dahil edilmez.

Frontend ve backend'i birlikte calistirmak icin:

```powershell
docker compose -f compose.yaml -f compose.frontend.yaml --profile app up -d --build --wait --wait-timeout 180
powershell -ExecutionPolicy Bypass -File ./scripts/test-frontend.ps1
```

Panel `http://localhost:5197` adresindedir. Bu API, son 20 FAIL kaydini ve
backend sagligini sunar; tum uretim sayisi, kamera goruntusu ve PASS gecmisi
su an sunulmaz. Docker backend saat dilimi UTC'dir; eski kayitlarin zaman
dilimi kaynagina gore ayrica dogrulanmalidir.

Şeffaf PET su şişelerinde YOLO ile şişe ve kusur tespiti: `underfill` (düşük dolum), `missing_cap` (kapaksız), `loose_cap` (gevşek kapak).

## Dosyalar
- `visionqc_ron88_train.ipynb`: Colab eğitim not defteri (veri hazırlama, zaman blokları bölmesi, eğitim, değerlendirme).
- `webcam_test.py`: Eğitilmiş `best.pt` ile bilgisayar kamerasında canlı test.

## Veri
Kaggle: `jihadakbr/water-bottle-defect-level-detection-dataset`. Veri bu repoda yok; zip'i kendin indirip Colab'a yükle (`/content/dataset.zip`).
Havuz: sağlam, düşük dolum, kapaksız, gevşek kapak (1.150 görüntü). Kalan 350 görüntü (yabancı madde, hasarlı etiket, farklı marka) v1'de kullanılmadı.

## Eğitim
1. Colab'da not defterini aç, GPU seç (A100/L4/T4).
2. `dataset.zip` dosyasını sol panele yükle.
3. Çalışma zamanı → Tümünü çalıştır.

## Canlı test
```
pip install ultralytics opencv-python
python webcam_test.py --weights best.pt
```
Tuşlar: `q` çıkış, `s` kare kaydet. Mac'te kamera izni: Sistem Ayarları → Gizlilik ve Güvenlik → Kamera → Terminal.
Ağırlık dosyası (`best.pt`) repoda yok; eğitim sonrası Colab'dan indirilir.

## Sınırlar (önemli)
- v1 test sonuçları (mAP50 0,995; görüntü düzeyinde hatasız) **aynı çekim ortamında** ölçüldü: tek marka, sabit arka plan, aynı gün çekimi.
- Zaman bloklarına bölme yakın çekim sızıntısını azaltır ama fiziksel şişe bağımsızlığını garanti etmez.
- Yeni ortama (farklı arka plan, ışık, şişe) genelleme henüz doğrulanmadı; kendi şişelerinle ayrı bir test gerekir.
- Sonraki adım: farklı arka plan ve ışıkta ikinci bir veri kaynağı, fazla dolum ve eğik/yüksek kapak örnekleri.
