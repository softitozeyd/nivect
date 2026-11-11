# VisionQC kamera ve operasyon paneli

Bu klasör VisionQC paneliyle kullanılan yerel backend ve kamera servisini
içerir. Panelin kaynak kodu [legacy/frontend](../legacy/frontend) klasöründedir.
Kök dizindeki diğer uygulama ayrı bir sürümdür; iki sürümün kayıt ve kamera API
biçimleri birbirinden farklıdır.

## Windows üzerinde başlatma

Docker Desktop açıkken bu klasörde:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/setup-dev.ps1
docker compose -f compose.yaml -f compose.frontend.yaml --profile app up -d --build --wait --wait-timeout 180
```

Panel `http://localhost:5197`, backend `http://localhost:8080` adresindedir.
Portlar başka bir uygulama tarafından kullanılıyorsa önce çakışmayı giderin.
Bu sürüm yerel geliştirme içindir ve kullanıcı girişi sağlamaz; servisler
bilgisayarın yerel arayüzüne bağlanır.

Modelin kurulu olduğu Python ortamı ve ağırlık dosyasıyla ayrı bir terminalde:

```powershell
powershell -ExecutionPolicy Bypass -File ./camera/start.ps1 -Weights "C:\modelin-yolu\best.pt" -Python "C:\python-ortami\Scripts\python.exe"
```

Model dosyası ve yerel parolalar Git'e eklenmez. Kamera servisi GPU mevcutsa
GPU kullanır; görüntüler bu yerel servis tarafından işlenir.

Bu Compose projesi `visionqc-local` adıyla kendi veri alanlarını oluşturur.
Önceki `nivect-dev` verileri silinmez veya otomatik taşınmaz. Mevcut kayıtları
kullanmak için önce yedekleme ve uyumluluk kontrolüyle ayrı bir veri taşıma
işlemi gerekir; farklı backend sürümlerinin veri alanları doğrudan paylaşılmamalı.

Ön yüz testleri için `../legacy/frontend` klasöründe `npm ci` ve `npm test`;
backend testleri için bu klasörde `mvn verify` çalıştırılabilir.
