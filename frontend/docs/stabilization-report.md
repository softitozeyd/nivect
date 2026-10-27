# VisionQC stabilizasyon raporu

25 Ekim 2026 · Mevcut proje üzerinde doğrulama ve düzeltme. Uygulama yeniden oluşturulmadı; değişiklikler yalnızca bu frontend klasöründe yapıldı.

## Kapsam ve referans

Çalışma alanı ve erişilebilir ekler yeniden tarandı. VisionQC PDF dosyası mevcut değil. Bu nedenle PDF sayfaları, mimari çizimi veya ekran taslağı ile doğrudan karşılaştırma yapıldığı iddia edilmiyor. Karşılaştırma kullanıcının sağladığı VisionQC Master Execution Prompt v1.0 gereksinim metniyle yapıldı. PDF uyumu açık doğrulama maddesi olarak kalır.

## Tamamlanan özellikler

| Gereksinim        | Uygulama durumu                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Genel Bakış       | İnceleme/hata/oran/FPS, aktivite grafiği, son olaylar, veri zamanı, bağlantı/istasyon durumu                                                |
| Canlı İzleme      | Kaynaktan istasyon seçimi, temsili demo görseli veya API görüntüsü, AI kararı/güven/model/zaman, son uyarılar, yalnızca görünümü duraklatma |
| Hata Geçmişi      | Arama, tarih/tür/istasyon/karar filtreleri, sıralama, 10 kayıtlık sayfalar, olay detayı, görsel, CSV                                        |
| İstasyonlar       | Kamera/çıkarım, heartbeat, model, FPS, hata, seçili istasyona giden bağlantı; salt okunur                                                   |
| Raporlar          | Tarih aralığı, toplam/oran, hata dağılımı, istasyon karşılaştırması, tüm seçili dönemin trendi, CSV                                         |
| Ayarlar           | Tarayıcıda kalıcı saat dilimi, yenileme aralığı, bildirim ve kompakt tablo; kesinti simülasyonu                                             |
| Operatör inceleme | Hata onayı, yanlış alarm, incelemeye alma ve not; onay adımı; AI kararı ayrı korunur                                                        |
| Demo bağımsızlığı | Dış ağ istekleri engellenmişken tüm ekranlar çalıştı; FastAPI/PostgreSQL gerekmiyor                                                         |

Sağlanan metne göre eksik MVP ekranı bulunmadı. Operatör inceleme ayrı rota yerine olay penceresindedir.

## Düzeltilen hatalar

- CAM-02 kartı CAM-01 ekranını açıyordu. İstasyon artık URL parametresinde taşınır, sayfa yenilenince korunur.
- Kaydedilmiş yanlış alarm/inceleme kararı yeniden açıldığında form “Hatayı onayla” seçiyordu. Önceki karar ve not korunur.
- Onay ekranı açıldıktan sonra bağlantı kesilirse kayıt hâlâ tetiklenebiliyordu. Hem arayüz hem veri katmanı bunu engeller; onay sırasında form sabitlenir.
- Veri yokken “Uygun” temsili şişe gösterilebiliyordu. Artık açık boş durum gösterilir; API modunda eksik görsel simüle fotoğrafla doldurulmaz.
- Bir görsel yüklenemediğinde sonraki geçerli görüntü de gizli kalabiliyordu. Görsel durumu URL bazında sıfırlanır.
- Sıfır model güveni bazı alanlarda eksik değer gibi görünüyordu. %0.0 gösterilir.
- Milisaniye içermeyen UTC zamanları tarih sonu filtresinde dışlanabiliyor, sıralama hatalı olabiliyordu. Karşılaştırmalar sayısal zaman üzerinden yapılır.
- Rapor trendi seçili dönemi üç saatle sınırlıyordu. Artık seçili dönemin tamamı 12 eşit aralığa ayrılır; grafik saat dilimi kullanıcı tercihini izler. Tarih filtrelerinin İstanbul gün sınırları kullandığı arayüzde belirtilir.
- Bekleyen API isteği sırasında eski veri sağlıklı görünmeye devam edebiliyordu. Tazelik saati bağımsız güncellenir; eski yanıtlar iptal edilip yok sayılır, periyodik okumalar üst üste binmez, unmount temizliği testlidir.
- API modundaki sabit istasyon seçenekleri ve model metni kaynaktan türetilir. Boş istasyon listesi açıkça belirtilir.
- Bildirim kutusu hata kayıtları varken “uyarı yok” diyordu; artık değerlendirilmemiş AI tahminlerini bildirir. CSV bildirimi kullanıcı tercihine uyar.
- CSV operatör notlarında baştaki boşluk/kontrol karakterinden sonra gelen formül işaretleri de güvenli metin olarak dışa aktarılır.

İlk eklenen yedi regresyon testi düzeltmeden önce başarısız, düzeltmeden sonra başarılı çalıştı. Testler devre dışı bırakılmadı.

## Gerçekte çalıştırılan kontroller

| Komut / kontrol   | Sonuç                                                                       |
| ----------------- | --------------------------------------------------------------------------- |
| npm run typecheck | Başarılı; src yanında e2e testleri ve Playwright ayarları da kontrol edilir |
| npm run lint      | Başarılı                                                                    |
| npm run build     | Başarılı; dist/ güncel                                                      |
| npm test          | 4 dosyada 27/27 başarılı                                                    |
| npm run test:e2e  | 16/16 başarılı: 12 demo + 4 API sözleşmesi senaryosu                        |

Playwright: navigasyon, metrik/grafik görünümü, filtreler, sıralama altyapısı, sayfalama, detay, üç inceleme kararı, vazgeçme/onay, CSV indirme, istasyon bağlantısı, yenilemede istasyon korunması, gerçek görünüm dondurma/sürdürme, otomatik olay gelişleri, bağlantı kesintisi ve geri dönüş, ayar kalıcılığı, klavye odağı ve Escape. Dış ağ engellenerek demo bağımsızlığı denendi.

API testleri gerçek backend kullanmaz: ayrı 5198 portunda API moduna karşı Playwright ile kontrollü yanıtlar verilir. 503 hata/yeniden deneme, geçerli CAM-99 verisi, sıfır güven, boş liste, bozuk şema, bekleyen istekte gecikmiş durum ve gerçek kayıt yazımının kapalı olması doğrulandı. Bunlar gerçek FastAPI entegrasyonu olarak sayılmaz.

Birim testleri ayrıca zaman sınırları, grafikte dönem uçlarının dahil edilmesi, toplamların tutarlılığı, 500 olay sınırı, benzersiz kimlikler, CSV kaçışları, eski istek yanıtını yok sayma, üst üste polling yapmama ve unmount sonrası zamanlayıcı/istek temizliğini kapsar.

## Görsel ve responsive kontrol

Genel Bakış ve Hata Geçmişi: 1440/1024/768/390 px. İzleme, İstasyonlar, Raporlar ve Ayarlar: aynı dört genişlik. Sayfa taşması test edildi; tablolar kendi kabında kaydırılır. Tüm ekranlarda ve olay penceresinde Axe WCAG 2 A/AA ve 2.1 AA otomatik taraması başarılı. Bu sonuç manuel ekran okuyucu veya saha değerlendirmesi yerine geçmez.

Güncel önizleme: http://127.0.0.1:5197/ . Kullanıcının açık tarayıcı sekmesinde CAM-02 kartının doğru istasyonu açtığı ayrıca doğrulandı. Görseller docs/screenshots altında saklanır.

## Eksik özellikler ve bilinen sınırlar

- PDF bulunmadığı için PDF'ye birebir uyum doğrulanamadı.
- Gerçek FastAPI/OpenAPI, kimlik doğrulama/yetkilendirme, üretim görüntüleri ve edge bağlantısı mevcut değil. API yolları hâlâ PROPOSED.
- Büyük arşiv için backend sayfalaması/filtreleri ve sunucu özetleri yok; demo en fazla 500 oturum kaydını gösterir. Sayaçlar vardiya toplamı değildir.
- Demo değerlendirmeleri bellektedir; sayfa yenilemesinde sıfırlanır. Tercihler tarayıcıda kalır.
- MVP tek üretim hattı ve ürün ailesi varsayar. Çoklu hat yönetimi ve kamera/model ayar mutasyonları uygulanmadı.
- OCR Faz 2. Recall/yanlış ret oranı için etiketli gerçek veri gerekir; doğrulanmış model başarımı gösterilmez.
- Gerçek kamera video yayını yok; demo görselleri temsilidir. Firefox/WebKit, uzun süreli fabrika yükü ve saha güvenliği doğrulanmadı.

Bu test kapsamı içinde bilinen kritik demo engeli kalmadı. Bunlar üretim hazır olma iddiası değildir.

## Backend hazırlığı ve önerilen sonraki adım

Tipli adaptör sınırı, dış yanıt şema doğrulaması, istek zaman aşımı/iptali, kontrollü polling, hata görünümü ve entegrasyon belgeleri hazır. Gerçek kayıt mutasyonları onaylı auth/API olmadan kapalı kalır. PostgreSQL doğrudan tarayıcıya bağlanmaz.

Önerilen sonraki iş: PDF ile gereksinim izini tamamlamak ve backend ekibinin gerçek OpenAPI şemasını mevcut önerilen sözleşmeyle eşlemek. Ardından yetkili görüntü erişimi ve gerçek istasyon heartbeat verileriyle uçtan uca entegrasyon testi yapılmalı. Bu çalışma için kullanıcıdan kod yazması veya elle hata düzeltmesi istenmedi.

Son görsel inceleme sonrası tablet tablosunun gereksiz daralması, önizleme alt yazısı ve hatalı karardaki onay simgesi düzeltildi. TypeScript/lint/build tekrar başarılı; ilgili responsive/klavye/erişilebilirlik grubu 7/7 yeniden geçti. Görsel olarak 1440 masaüstü, 768 tablet ve 390 mobil örnekleri araçla açılarak incelendi.
