# Frontend mimarisi — Nivect uyarlaması

UI → Provider → InspectionAdapter → DemoAdapter veya Nivect ApiAdapter. Altı rota, açık mavi tasarım, operatör demo incelemesi ve filtre/CSV/rapor/tercih akışları korunur.

`src/services/nivect.ts`: doğrulanmış failures/health yolları, dış JSON için Zod şemaları, Java LocalDateTime normalizasyonu ve kayıpsız boolean kusur eşlemesi. API snapshot yalnızca son 20 FAIL kaydını taşır, stations boş ve coverage=failures-only olur. backendHealth ayrı tutulur. API sınırındaki eksik alanlar uydurulmaz; model confidence null, modelVersion ve stationId sağlanmıyor, imageUrl null.

`src/services/adapter.ts`: demo seed/simülasyon ve seçilen adaptör. Demo Ron 88 PET, eksik/gevşek kapak ve düşük dolum verileri üretir. Demo durumları açıkça simüledir. 500 olay sınırı ve ayrı operator review alanı korunur. Model alt sınıfları mevcut backend boolean'larından geri çıkarılmaz.

`src/store.tsx`: okuma, hata ve son başarılı güncelleme; yerel UI state; doğrulanan localStorage tercihleri; polling/iptal/tazelik saati. Yeni okuma önceki isteği iptal eder; eski yanıt yeni durumu ezmez. GET için en fazla iki deneme (network/5xx/429); 4xx ve iptal otomatik yeniden denenmez. 8 saniyelik timeout ve unmount temizliği vardır. Gerçek mod review yazımı desteklenmediğinden engellenir.

`src/domain.ts`: ortak UI domain, event/station şemaları, kusurlar/checks, filtreler, tarih ve grafik kovaları. `src/utils/csv.ts`: tüm kusurları ve ham bayrakları korur, formül/quote kaçışları uygular. Tarih filtreleri İstanbul gün sınırını kullanır. Genel bakış son üç saat, rapor tüm seçili dönem; yalnızca gelen kayıtları sayar.

API modunda izleme kamera değil hat bazlı son hata kaydıdır. İstasyon sayfası eksik telemetry açıklaması gösterir. Rapor karşılaştırması lineCode bazında hata kaydıdır; production rate gösterilmez. UI capabilities, failures-only kapsamıyla farklılaşır; aynı ekranlar yeniden yazılmadan yeni backend kaynakları eklenebilir.

Vite API modu ve Nginx aynı origin read-only proxy sağlar. İstemci veritabanı/Redis/MQTT sırlarına erişmez. Docker/Compose frontend paketi monorepo içine eklenebilir; backend kaynaklarına dokunmaz.
