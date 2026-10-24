# Yerel gelistirme altyapisi

Bu paket PostgreSQL, Redis ve MQTT broker ile Spring Boot backend'i calistirir.
Model/kamera, canli panel ve PLC baglantisi bu kurulumun parcasi degildir.

## Baslatma (PowerShell)

Depo kokunde, Docker Desktop calisirken:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/setup-dev.ps1
docker compose config --quiet
docker compose up -d --wait
docker compose ps
```

Kurulum betigi var olan `.env` dosyasini degistirmez. Her gelistirici kendi
bilgisayarinda calistirir. Parolalari commit etmeyin; `.env.example` yalnizca
anahtarlari belgeler. Veri dosyalari named volume icinde kalir.

## Backend'i Docker ile baslatma

Java veya Maven'i bilgisayara kurmak gerekmez. Ilk build Java/Maven imajlarini
ve Maven bagimliliklarini indirir:

```powershell
docker compose --profile app up -d --build --wait --wait-timeout 180
docker compose --profile app ps
powershell -ExecutionPolicy Bypass -File ./scripts/test-backend.ps1
```

Backend: `http://localhost:8080`, saglik: `/actuator/health`.
`BACKEND_PORT` ile host portu degistirilebilir; test betigi varsayilan 8080'i
kullanir. Build asamasinda Java testleri calisir. Uc altyapi servisi icin
onceki profilsiz `up` komutu kullanilmaya devam edilebilir.

Backend endpoint'leri su an kullanici kimlik dogrulamasi icermez. Bu Compose
paketi host portlarini yalnizca bu bilgisayara baglar; uretim yayini degildir.

## Spring Boot baglantisi

Ekip tarafindan teyit edilen temel: Java 21 + Maven. Maven Wrapper dosyalari
(`mvnw`, `mvnw.cmd`, `.mvn/`) Spring Boot iskeletiyle birlikte repoya alinmali.
Mevcut iskelet Spring Boot 3.3.4 kullanir. Bu degisiklikte framework surumu
yukseltilmedi.

Arkadasinizin uygulamasi IDE'den calisirken:

| Ayar | Deger |
|---|---|
| JDBC URL | `jdbc:postgresql://localhost:5432/nivect` |
| DB kullanicisi | `nivect` |
| DB parolasi | `.env` icindeki `POSTGRES_PASSWORD` |
| Redis host / port | `localhost` / `6379` |
| Redis parolasi | `.env` icindeki `REDIS_PASSWORD` |
| MQTT URI | `tcp://localhost:1883` |
| MQTT kullanicisi | `nivect` |
| MQTT parolasi | `.env` icindeki `MQTT_PASSWORD` |

`application.yml` icindeki acik `spring.config.import` ayari sayesinde IDE'de
calisma dizini repo koku ise yerel `.env` okunur. Baska dizinden baslatilirsa
ortam degiskenleri IDE run configuration'a eklenmelidir. Sifrelerin varsayilan
degeri yoktur; eksik sifreyle uygulama baslamaz. Compose backend'e degerleri
environment olarak verir; `.env` Docker imajina kopyalanmaz.
Docker icinde hostlar `postgres`, `redis`, `mosquitto` ve PostgreSQL portu 5432'dir.

Mevcut iskelet `ddl-auto: update` kullanir; surumlu migration henuz eklenmedi.
Docker init SQL ile ikinci bir sema kaynagi olusturulmaz. TimescaleDB bu pakete
dahil degildir.

## Testler

Uc servisin baglanti testini birlikte calistirmak icin:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/test-infra.ps1
```

```powershell
docker compose exec -T postgres sh -ec 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;"'
docker compose exec -T redis sh -ec 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping'
```

MQTT testi icin iki terminal acin. Ilk terminal:

```powershell
docker compose exec -T mosquitto sh -ec 'mosquitto_sub -h localhost -u "$MQTT_USERNAME" -P "$MQTT_PASSWORD" -t nivect/dev/test -q 1 -C 1 -W 30'
```

Ikinci terminal:

```powershell
docker compose exec -T mosquitto sh -ec 'mosquitto_pub -h localhost -u "$MQTT_USERNAME" -P "$MQTT_PASSWORD" -t nivect/dev/test -q 1 -m altyapi-test'
```

Ilk terminalde `altyapi-test` gorunmeli. Bu test model veya backend entegrasyonu
basarisi degildir.

## Durdurma ve veriler

```powershell
docker compose stop
docker compose start --wait
docker compose logs --tail 50
```

`docker compose down` container ve agi kaldirir, named volume'leri korur.
`docker compose down -v` verileri siler; normal kapatma icin kullanmayin.
PostgreSQL ilk acilista kullanici ve DB olusturur; `.env` parolasini sonradan
degistirmek mevcut DB kullanicisinin parolasini degistirmez.

## Mesaj ve kalan dayaniklilik isleri

- Backend'in varsayilan sonuc topic'i: `production/+/inspections`;
  ornek yayin: `production/line-1/inspections`, QoS 1, retain false.
  `MQTT_TOPIC` ve `MQTT_CLIENT_ID` ile ayarlanabilir. Her aktif backend
  icin farkli client ID kullanilmalidir.
- Ayni olayin yeniden gonderiminde `event_id` korunur. JSON semasi Python ve
  backend gelistiricileriyle birlikte kesinlestirilmelidir.
- Mevcut worker Redis List'ten en fazla 500 kaydi saniyede bir alir. Listeden
  cikarma DB commit oncesindedir; DB hatasi veya proses kaybinda kayit kaybi
  riski surer. Bu degisiklik baglanti entegrasyonudur, tam dayaniklilik cozumunu
  icermez. Sonraki adim: Streams consumer group, commit sonrasi XACK, pending
  kurtarma ve DB benzersiz olay kimligi.
- MQTT aboneligi kalici client/session ve kontrollu ACK ile tasarlanmalidir.
  Broker onayi, DB'ye kaydedildi onayi degildir.
- Redis AOF everysec ve Mosquitto persistence aciktir. Ani guc kaybinda kayip
  araligi olabilir; volume tek basina yedek veya sifir kayip garantisi degildir.
  Kayip toleransi belirlenince publisher outbox/tekrar gonderim eklenmelidir.
- Host portlari sadece 127.0.0.1'e baglidir. Bu yerel gelistirme paketidir;
  baska bilgisayar kendi Compose'unu calistirir. Internet/LAN yayini veya
  fiziksel PLC/siren komutu bu paketin parcasi degildir.

Mevcut backend'in kabul ettigi ornek JSON (model tarafiyla kesinlestirilecek):

```json
{"lineCode":"line-1","capOk":true,"labelOk":true,"liquidLevelOk":true,"imagePath":null}
```

Su an karar PASS/FAIL; REVIEW/INVALID ve eksik alan dogrulamasi henuz yoktur.
Etiket kontrolu planlanan kapsamda olmayabilir; model ekibiyle anlasilmadan
bu ornek bir kalite kabul standardi olarak kullanilmamalidir.

## Dogrulama — 24 Ekim 2026

Uc servis Docker Desktop uzerinde healthy durumuna geldi.
`scripts/test-infra.ps1` ile PostgreSQL SELECT 1, Redis PING ve MQTT QoS 1
publish/subscribe testleri gecti. Bu sonuc Spring Boot/model entegrasyon testi
veya veri kaybi dayaniklilik testi degildir.

Ilk baglanti testleri host 15432 portunda yapildi. Varsayilan host portu daha
sonra ekip karariyla 5432 olarak guncellendi. Bu portta baska bir PostgreSQL
servisi varsa Docker baslatilmadan once port cakismasi cozulmelidir.
Bu degisiklik veritabani adi, kullanicisi ve parolasini degistirmez.

5432 portuna gecis sonrasi uc servis tekrar healthy oldu; PostgreSQL SELECT 1,
Redis PING ve MQTT publish/subscribe testleri yeniden gecti. Bilgisayardaki
ayri Windows PostgreSQL 18 servisi kullanici onayiyla durduruldu; mevcut
verileri silinmedi.

## Backend baglanti testi

Backend baglanti dogrulamasi (24 Ekim 2026): Java 21 Maven verify build'i
3 test, 0 hata ile gecti. Docker'da dort servis healthy oldu. Test betigi MQTT
uzerinden bir FAIL ve HTTP uzerinden bir PASS kaydi gonderdi; ikisi PostgreSQL'de
bulundu ve FAIL kaydi failures API'sinden okundu. Ornekler test mesajlaridir;
gercek model/dogruluk veya kesintide veri kaybi deneyi degildir.

## Resmi kaynaklar

- https://hub.docker.com/_/postgres
- https://hub.docker.com/_/redis
- https://hub.docker.com/_/eclipse-mosquitto
- https://mosquitto.org/man/mosquitto-conf-5.html
