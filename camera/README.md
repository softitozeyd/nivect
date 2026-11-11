# Yerel kamera ve model testi

Kamera görüntüsü tarayıcıda izin verilince alınır; model bu bilgisayarda 127.0.0.1:8765 üzerinde çalışan Python servisi tarafından işlenir. Görüntüler kaydedilmez. `best.pt` depoya eklenmez; güvenilir model dosyasını ayrıca temin edin.

Windows üzerinde Python ortamınıza `camera/requirements.txt` bağımlılıklarını kurun. NVIDIA GPU kullanımı, kurulu PyTorch sürümünün CUDA desteğine bağlıdır. Ardından proje kökünde:

```powershell
powershell -ExecutionPolicy Bypass -File ./camera/start.ps1 -Weights "C:\model\best.pt" -Python "C:\model\venv\Scripts\python.exe"
```

Docker ile backend ve frontend'i başlatın, `http://localhost:5197/monitoring` sayfasını açın. Kamera açılınca kayıt varsayılan olarak kapalıdır. Kaydı başlatmak yeni bir üretim oturumu açar veya yarım kalmış oturumu sürdürür; kaydı durdurmak oturumu bitirir. Kamera veya sayfa kapanırsa oturum açık kalır ve sonraki girişte sürdürme ya da bitirme seçeneği sunulur.

Tek şişe en az üç tahminde görülüp üç boş tahminde kadrajdan çıktıktan sonra bir kez sayılır. Aynı hata üç ardışık tahminde doğrulanırsa FAIL; doğrulanmayan kısa hata veya kararsızlık varsa REVIEW; aksi halde PASS üretilir. Birden fazla şişe veya yetersiz gözlem varsa sayım yapılmaz. PASS için ayrıntı satırı yazılmaz; FAIL/REVIEW için sıra numaralı model kaydı saklanır. REVIEW, ayrılacak toplamına dahildir. Sıra kontrolü ve son isteğin kimliği işlemi tekrar denemede çift sayımı önler. Diğer sekme veya istemcilerle yarışma durumunda sıra uyuşmazlığı hata olarak gösterilir.

Bu bir yerel kamera denemesidir; tespit kaçırma, örtüşme veya saniyedeki kare sayısı dolayısıyla gerçek üretim sayımı olarak kullanılmaz. Şişe kadrajdan çıkmadan kayıt durursa kısmi gözlem sayılmaz. Fiziksel PLC, ayırma komutu, onay ve kesin sayım yoktur. Model etiket hatasını tespit etmez. Başlangıç eşikleri doğrulanmış üretim eşikleri değildir.
