# VisionQC

PET şişelerin kamera ile incelenmesi için VisionQC paneli. Bu rehber, ekibin
kullandığı VisionQC panelini ve ona uyumlu yerel servisleri başlatır.

## Windows'ta başlatma

Docker Desktop açıkken proje ana klasöründe PowerShell veya IntelliJ terminalinden:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/visionqc.ps1
```

Panel: http://localhost:5197. İlk çalıştırmada `visionqc/.env` dosyasında yerel
parolalar oluşturulur. Kamera ile tespit için Python model servisini ayrı bir
terminalde başlatın:

```powershell
powershell -ExecutionPolicy Bypass -File ./visionqc/camera/start.ps1 -Weights "C:\model\best.pt" -Python "C:\model\venv\Scripts\python.exe"
```

Dosya yollarını kendi bilgisayarınıza göre değiştirin. Model dosyası depoda
bulunmaz; Python ortamı ve kamera ayarları için [kamera rehberine](visionqc/camera/README.md) bakın.

Servislerin durumunu görmek veya durdurmak için:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/visionqc.ps1 -Action status
powershell -ExecutionPolicy Bypass -File ./scripts/visionqc.ps1 -Action stop
```

Bu kurulum `visionqc-local` adlı ayrı Docker veri alanları kullanır; eski
`nivect-dev` verilerini otomatik taşımaz. Varsayılan portlar kullanımda ise
önce port çakışmasını giderin. Servisler yerel kullanım içindir ve bu sürümde
kullanıcı girişi yoktur.

Panel kaynakları `legacy/frontend`, uyumlu backend ve model servisi `visionqc`
klasöründedir. Depo kökündeki diğer uygulama farklı API ve veritabanı şeması
kullanır; bu iki backend aynı veri alanına bağlanmamalıdır. Daha fazla bilgi:
[VisionQC yerel kurulum rehberi](visionqc/README.md).
