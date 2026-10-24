# Yerel gelistirme altyapisi

Bu paket sadece PostgreSQL, Redis ve MQTT broker kurar. Spring Boot, model,
canli panel veya PLC uygulamasi henuz bu akisa bagli degildir.

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

## Spring Boot baglantisi

Ekip tarafindan teyit edilen temel: Java 21 + Maven. Maven Wrapper dosyalari
(`mvnw`, `mvnw.cmd`, `.mvn/`) Spring Boot iskeletiyle birlikte repoya alinmali.
Spring Boot surumu iskelet geldikten sonra dogrulanacak.

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

`.env` dosyasini Spring Boot kendiliginden okumaz. Bu degerler IDE run
configuration ortam degiskenlerine alinmali ve uygulama ayarlari tarafindan
okunmalidir. Spring Boot surumu ve MQTT kutuphanesi iskelet gelince eslestirilecek.
Uygulama ileride Compose'a alinirsa hostlar `postgres`, `redis`, `mosquitto`
olur; container icinde `localhost` kullanilmaz.

Tablolari Spring Boot tarafindaki migration dosyalari yonetecek. Docker init SQL
ile ikinci bir sema kaynagi olusturulmaz. TimescaleDB bu ilk pakete dahil degildir.

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

## Mesaj ve dayaniklilik sozlesmesi (entegrasyonda tamamlanacak)

- Onerilen sonuc topic'i: `nivect/v1/inspections`; QoS 1, retain false.
- Ayni olayin yeniden gonderiminde `event_id` korunur. JSON semasi Python ve
  backend gelistiricileriyle birlikte kesinlestirilmelidir.
- Redis Streams consumer group kullanir; DB transaction commit sonrasi XACK.
  Pending mesajlar yeniden baslamada alinmali, DB benzersiz olay kimligiyle
  tekrar yazmayi engellemelidir.
- MQTT aboneligi kalici client/session ve kontrollu ACK ile tasarlanmalidir.
  Broker onayi, DB'ye kaydedildi onayi degildir.
- Redis AOF everysec ve Mosquitto persistence aciktir. Ani guc kaybinda kayip
  araligi olabilir; volume tek basina yedek veya sifir kayip garantisi degildir.
  Kayip toleransi belirlenince publisher outbox/tekrar gonderim eklenmelidir.
- Host portlari sadece 127.0.0.1'e baglidir. Bu yerel gelistirme paketidir;
  baska bilgisayar kendi Compose'unu calistirir. Internet/LAN yayini veya
  fiziksel PLC/siren komutu bu paketin parcasi degildir.

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

## Resmi kaynaklar

- https://hub.docker.com/_/postgres
- https://hub.docker.com/_/redis
- https://hub.docker.com/_/eclipse-mosquitto
- https://mosquitto.org/man/mosquitto-conf-5.html
