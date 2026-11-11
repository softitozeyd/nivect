package com.vision.qc.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.Semaphore;

@RestController @RequestMapping("/api/v1/vision")
public class VisionController {
    private final WebClient client;
    @Value("${qc.minimum-confidence:0.65}") private double minimumConfidence;
    private final Semaphore capacity=new Semaphore(2);
    public VisionController(@Value("${qc.vision-url}") String baseUrl) {
        client=WebClient.builder().baseUrl(baseUrl).codecs(c -> c.defaultCodecs().maxInMemorySize(2*1024*1024)).build();
    }
    @GetMapping("/status")
    public Mono<Map> status() {
        return client.get().uri("/health").retrieve().bodyToMono(Map.class).map(result -> { result.put("minimumConfidence",minimumConfidence); return result; }).timeout(Duration.ofSeconds(3))
            .onErrorReturn(Map.of("status","offline","modelReady",false,"message","Yerel model servisi bağlı değil","minimumConfidence",minimumConfidence));
    }
    @PostMapping(value="/frame",consumes=MediaType.IMAGE_JPEG_VALUE)
    public Mono<Map> infer(@RequestBody byte[] image) {
        if(image.length>2*1024*1024 || image.length<4)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"JPEG must be between 4 bytes and 2 MB");
        if(!capacity.tryAcquire()) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Inference is busy");
        return client.post().uri("/infer").contentType(MediaType.IMAGE_JPEG).bodyValue(image)
            .retrieve().bodyToMono(Map.class).timeout(Duration.ofSeconds(15))
            .onErrorMap(e -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Model servisi hazır değil; tespit kaydı oluşturulmadı"))
            .doFinally(s -> capacity.release());
    }
}
