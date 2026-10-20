# VisionQC PET: Ron 88 şişe kusur tespiti (v1)

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
