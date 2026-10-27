# GitHub özel depo hazırlığı

Henüz GitHub deposu oluşturulmadı; uzak depo eklenmedi ve hiçbir push yapılmadı. Kullanıcının açık onayı olmadan push yapılmayacak.

## Yerel güvenlik kontrolü

Takip edilen kaynaklar ve tüm mevcut Git geçmişi yaygın anahtar/token/parola/özel anahtar kalıpları için tarandı; bulgu yok. Gerçek .env dosyası geçmişte veya kaynaklarda bulunmadı. Önceki .env.example yalnızca VITE_DATA_MODE=demo ve localhost API adresi içeren zararsız şablondur. Şu anki kaynak ağacında config.example olarak yeniden adlandırıldı. Önceki commitlerdeki eski şablon adı tarihçede durur; geçmiş yeniden yazılmadı. Bu geçmiş de gönderimden önce kullanıcının incelemesine sunulmalıdır.

.gitignore tüm .env ve .env.* çeşitlerini (alt klasörler dahil), yerel bağımlılıkları, derleme/test çıktılarını ve yaygın özel anahtar dosyalarını dışlar. Gitignore zaten takip edilen dosyaları geçmişten silmez; bu yüzden geçmiş ayrıca tarandı.

Tarama kalıp tabanlıdır; sonucu docs/github-preflight.json içinde bulunur. Gerçek gizli bilgi tespit edilirse gönderim durdurulmalı, anahtar iptal edilmeli ve geçmiş temizliği ayrıca ele alınmalıdır.

## Adımlar

1. GitHub eklentisi üzerinden hesabın bağlantısını kullanıcı tamamlar.
2. Hesap/organizasyon ve depo adı seçilir. Önerilen ad: visionqc-frontend. Görünürlük: private.
3. Bağlantı doğrulanır; hedef URL, branch, aktarılacak dosyalar ve son güvenlik kontrolü kullanıcıya gösterilir.
4. Kullanıcının açık gönderim onayı alınır. Hesap bağlamak veya depo adı seçmek push onayı sayılmaz.
5. Yalnızca onaydan sonra özel depo oluşturma/uzak depo yapılandırma ve belirlenen branch'i gönderme işlemleri yapılır. Depo oluşturma da henüz yapılmadı.
6. GitHub üzerinde private görünürlüğü ve gönderilen commit doğrulanır. Takım üyeleri yalnızca kullanıcı ayrıca yetkilendirirse davet edilir.

Şu anda paylaşım, davet, repository oluşturma ve push beklemededir.
