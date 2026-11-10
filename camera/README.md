# Yerel kamera ve model testi

Kamera görüntüsü tarayıcıda izin verilince alınır; model bu bilgisayarda 127.0.0.1:8765 üzerinde çalışan Python servisi tarafından işlenir. Görüntüler kaydedilmez. `best.pt` depoya eklenmez; güvenilir model dosyasını ayrıca temin edin.

Windows üzerinde Python ortamınıza `camera/requirements.txt` bağımlılıklarını kurun. NVIDIA GPU kullanımı, kurulu PyTorch sürümünün CUDA desteğine bağlıdır. Ardından proje kökünde:

```powershell
powershell -ExecutionPolicy Bypass -File ./camera/start.ps1 -Weights "C:\model\best.pt" -Python "C:\model\venv\Scripts\python.exe"
```

Docker ile backend ve frontend'i başlatın, `http://localhost:5197/monitoring` sayfasını açın. Kamera açılınca kayıt varsayılan olarak kapalıdır. Kayıt açılırsa üç ardışık hatalı tahminden sonra yalnızca kusur türü ve zaman `model_detections` tablosuna yazılır. Yeni ürün için şişenin üç tahmin boyunca kadrajdan çıkması gerekir. Bu sezgisel kural kesin tekil ürün sayımı sağlamaz. Kullanılan model etiket hatası tespit etmez; kontrol edilmemiş alanlar başarılı olarak kaydedilmez. Kayıt durdurulduğunda o ana kadar gönderilmiş ve işlenmekte olan istek tamamlanabilir. Başlangıç eşikleri doğrulanmış üretim eşikleri değildir.
