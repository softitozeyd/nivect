# Yerel sistem: ekranların veri kapsamı

- Canlı İzleme: tarayıcının kamerası ve 127.0.0.1 üzerindeki Python modeli; kayıt açılınca kadrajdan çıkan ve yeterince gözlenen şişe için sayaç güncellenir; hatalı ve kararsız sonuçlar PostgreSQL'e ayrıntılı yazılır. Kamera kapatıldığında veya sayfadan ayrılınca akış durur. Şişenin kadrajdan çıkarılmasına dayalı tekrar azaltma kesin sayım değildir.
- Genel Bakış: mevcut backend hata kayıtları ve yerel kamera hatalarının yakın örnekleri; üstteki toplam hata kaydı sayısı veritabanındaki bu iki kaynağın toplamıdır, fiziksel ürün adedi değildir. Kamera test oturumu için sayılan ürün ve ayrılacak oranı ayrı gösterilir; gerçek bant üretimi veya model doğruluğu hesaplanmaz.
- İnceleme Geçmişi: iki kaynaktan gelen en fazla 100 yakın kayıt birlikte sunulur; filtreler ve CSV indirme bu pencereye uygulanır. Başarılı kayıtlar yalnızca eski HTTP/MQTT yoluyla üretilmişse görünür. Kamera başarıları kullanıcı tercihi gereği kaydedilmez.
- Raporlar: yakın hatalı kayıtların dönem filtresi ve dağılımı. Tarih filtresi tüm veritabanını sorgulamaz.
- Operatör değerlendirmesi: kayıt başına sonuç ve not PostgreSQL'de tutulur. Son 500 değerlendirme arayüze aktarılır. Geliştirme ortamında kullanıcı kimlik doğrulaması ve değerlendirme geçmişi yoktur.
- İstasyonlar: yerel model servisinin durumu ve bildirdiği işlemci görüntülenir. Harici istasyon envanteri veya kamera heartbeat'i henüz yoktur; servis durumu kamera donanımını doğrulamaz.
- Ayarlar: dil, saat dilimi, yenileme aralığı ve görünüm tarayıcıda saklanır; backend üzerinden paylaşılmaz. Demo bağlantı simülasyonu yalnızca demoda çalışır.
- Kayıtlı görüntü, fiziksel PLC kontrolü, güvenilir model sürümü ve üretim doğruluk metrikleri mevcut değildir.

Model servisini başlatma için `camera/README.md` dosyasına bakın. Bu sürümde kameranın çıkardığı hata kayıtları doğrudan HTTP ile backend'e gider; MQTT yalnızca mevcut harici üretici akışı içindir. Kamera ile diğer ekranlar arasında yerel `model_detections` tablosu ortak kaynaktır.

## Test amaçlı üretim oturumu

Kayıt başlatılınca oturum açılır veya açık oturum sürdürülür; durdurulunca oturum tamamlanır. Bir şişe ayrılıp tespit tamamlandığında toplam, uygun, hatalı veya kararsız sayacı işlemsel olarak güncellenir. Uyguna ayrıntı satırı yazılmaz; hatalı ve kararsız sonuçlara oturum ve sıra numarası yazılır. Kararsız sonuçlar panelde ayrılacak sayısına dahil edilir. Kamera kapanırsa açık oturum korunur ancak kayıt durur; yeniden başlatılabilir ya da bitirilebilir. Sayım geçici görüntü takibine bağlıdır ve üretim sensörü yerine geçmez. Fiziksel ayırma yoktur.
