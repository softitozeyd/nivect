package com.vision.qc.worker;

import com.vision.qc.entity.BottleInspection;
import com.vision.qc.repository.BottleInspectionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class BatchDbWriterWorker {

    private final ReactiveStringRedisTemplate redisTemplate;
    private final BottleInspectionRepository repository;
    private final ObjectMapper objectMapper;

    private static final String REDIS_BUFFER_KEY = "buffer:bottle_inspections";
    private static final int BATCH_SIZE = 500;

    @Scheduled(fixedRate = 1000) // Her 1 saniyede bir çalışır
    public void flushRedisToDatabase() {
        redisTemplate.opsForList().size(REDIS_BUFFER_KEY)
                .flatMap(size -> {
                    if (size == 0) return reactor.core.publisher.Mono.empty();

                    long popCount = Math.min(size, BATCH_SIZE);
                    List<BottleInspection> batchList = new ArrayList<>();

                    return redisTemplate.opsForList().leftPop(REDIS_BUFFER_KEY, popCount)
                            .doOnNext(json -> {
                                try {
                                    BottleInspection entity = objectMapper.readValue(json, BottleInspection.class);
                                    batchList.add(entity);
                                } catch (Exception e) {
                                    log.error("JSON parse hatası: ", e);
                                }
                            })
                            .then(reactor.core.publisher.Mono.fromCallable(() -> {
                                if (!batchList.isEmpty()) {
                                    repository.saveAll(batchList);
                                    log.info("{} adet kayıt PostgreSQL'e toplu yazıldı.", batchList.size());
                                }
                                return null;
                            }));
                }).subscribe();
    }
}