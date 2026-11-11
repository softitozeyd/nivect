# VisionQC

VisionQC, PET şişelerin kamera ile kontrolü için kullanılan yerel uygulamadır.
Panel, backend ve kamera servisi aynı proje içinde yer alır.

## Windows'ta başlatma

Docker Desktop'ı açın. Proje ana klasöründeki PowerShell veya IntelliJ terminalinde:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/visionqc.ps1
```

İlk çalıştırmada yerel parolalar `.env` dosyasında oluşturulur. Paneli
[localhost:5197](http://localhost:5197) adresinden açın. Kamera ile tespit
yapmak için model servisi ayrıca çalışmalıdır:

```powershell
powershell -ExecutionPolicy Bypass -File ./camera/start.ps1 -Weights "C:\model\best.pt" -Python "C:\model\venv\Scripts\python.exe"
```

Örnekteki dosya yollarını bilgisayarınızdaki model ve Python ortamına göre
değiştirin. Model dosyası repoda bulunmaz. Bir Python ortamı oluşturmak için:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r camera/requirements.txt
```

Bu ortamı kullanıyorsanız, yukarıdaki `-Python` değeri için proje içindeki
`.venv\Scripts\python.exe` dosyasının tam yolunu kullanın. GPU kullanımı,
CUDA destekli PyTorch kurulumuna bağlıdır. Python ortamı ve kamera hakkında
[kamera rehberine](camera/README.md) bakın.

Servislerin durumu ve durdurulması:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/visionqc.ps1 -Action status
powershell -ExecutionPolicy Bypass -File ./scripts/visionqc.ps1 -Action stop
```

`stop` veritabanı kayıtlarını silmez. Bu kurulum `visionqc-local` adlı ayrı
Docker veri alanları kullanır; önceki `nivect-dev` kayıtlarını otomatik olarak
taşımaz. Portlar
başka bir uygulama tarafından kullanılıyorsa önce çakışma giderilmelidir.

## Kaynak kodu

- Panel: `frontend/`
- Backend: `src/`
- Yerel model servisi: `camera/`

Bu yerel sürüm kullanıcı girişi sağlamaz ve servisler yalnızca aynı bilgisayara
açıktır. Yerel test içindir; internete veya ortak ağa açmak için kimlik doğrulama ve
güvenlik ayrıca geliştirilmelidir.
