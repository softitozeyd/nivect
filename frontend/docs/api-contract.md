# Nivect API sözleşmesi — doğrulanan kaynak

27 Ekim 2026: softitozeyd/nivect commit `31c9ce15d179b1f6664b5e4b61de45da4ebd5f00`. Önceki `/api/v1/snapshot` önerisi kullanılmıyor. Gerçek backend Spring Boot 3.3.4, Java 21, PostgreSQL + Redis + MQTT'dir.

## CONFIRMED

Kaynaklar:

- [Controller](https://github.com/softitozeyd/nivect/blob/31c9ce15d179b1f6664b5e4b61de45da4ebd5f00/src/main/java/com/vision/qc/controller/BottleInspectionController.java)
- [Entity](https://github.com/softitozeyd/nivect/blob/31c9ce15d179b1f6664b5e4b61de45da4ebd5f00/src/main/java/com/vision/qc/entity/BottleInspection.java)
- [Repository](https://github.com/softitozeyd/nivect/blob/31c9ce15d179b1f6664b5e4b61de45da4ebd5f00/src/main/java/com/vision/qc/repository/BottleInspectionRepository.java)
- [Service](https://github.com/softitozeyd/nivect/blob/31c9ce15d179b1f6664b5e4b61de45da4ebd5f00/src/main/java/com/vision/qc/service/impl/BottleInspectionServiceImpl.java)

`GET /api/v1/inspections/failures` → JSON dizisi, `findTop20ByOverallResultOrderByInspectedAtDesc("FAIL")` sonucudur. Sunucu filtre/pagination parametreleri yok. Frontend sadece bu 20 kaydı yerel filtreler, onarlı sayfalar ve CSV ile sunar; sınırsız geçmiş iddia etmez.

```json
[
  {
    "id": 12,
    "lineCode": "line-1",
    "capOk": false,
    "labelOk": true,
    "liquidLevelOk": false,
    "overallResult": "FAIL",
    "imagePath": "snapshots/bottle.jpg",
    "inspectedAt": "2026-10-27T12:00:00.123456789"
  }
]
```

Alanlar: pozitif Long id (JS güvenli tam sayı aralığı doğrulanır), lineCode 1–50 karakter, üç zorunlu boolean, overallResult FAIL, imagePath null/string, inspectedAt Java LocalDateTime. Tekrarlanan kimlik, bozuk alan, tutarsız FAIL (tüm kontroller true) veya 20'den büyük yanıt kabul edilmez. Hata demo ile değiştirilmez.

Eşleme: capOk=false → Kapak hatası; labelOk=false → Etiket hatası; liquidLevelOk=false → Dolum seviyesi hatası. Çoklu false → birden fazla kusur ve kayıpsız `defects`/`checks`. Eksik/gevşek kapak veya düşük/yüksek dolum alt sınıfı çıkarılmaz. Kamera kimliği, FPS, confidence, model version yok; uydurulmaz. imagePath bir dosya yolu olabilir, HTTP route'u değildir. Tarayıcı bunu yüklemeye çalışmaz.

`GET /actuator/health` → `{status:"UP"}` veya sağlık durumu. Backend sağlık yanıtı kamera/model sağlığını kanıtlamaz. Sağlık okunamasa bile geçerli hata listesi korunur; unknown/down gösterilir. Son başarılı API okuma zamanı, son ürün denetim zamanı değildir.

`POST /api/v1/inspections` → 202 Accepted, body `{lineCode,capOk,labelOk,liquidLevelOk,imagePath}`. Edge verisini Redis kuyruğuna alır; DB kaydı daha sonra worker tarafından yapılır. Frontend bu uç noktaya yazmaz. Auth sözleşmesi yok.

## ASSUMPTIONS

Backend timestamp saat dilimsizdir. Varsayılan +03:00 yalnızca belgelenmiş geliştirme varsayımıdır; server timezone teyit edilmelidir. Nanosaniye değerler milisaniyeye indirilip UTC'ye normalleştirilir. Frontend/env yalnızca API adresi, mod ve saat farkı taşır; secret taşımaz.

## NOT AVAILABLE / sonraki ekip işleri

Tam inspection listesi/PASS kayıtları, toplam ve vardiya summary, arşivde sunucu filtre/pagination, görüntü erişimi, station/heartbeat/FPS/model sürümü/confidence, operator review ve auth/authorization route'ları yok. SSE/WebSocket/video route'u yok; kontrollü polling kullanılır. Bunlar onaylanmadan frontend endpoint üretmez.
