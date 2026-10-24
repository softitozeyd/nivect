package com.vision.qc.service.impl;

import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.entity.BottleInspection;
import com.vision.qc.repository.BottleInspectionRepository;
import com.vision.qc.service.BottleInspectionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BottleInspectionServiceImpl implements BottleInspectionService {

    private final BottleInspectionRepository repository;
    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String REDIS_BUFFER_KEY = "buffer:bottle_inspections";

    @Override
    public Mono<Void> processInspection(BottleInspectionDto dto) {
        return Mono.fromRunnable(() -> {
            try {
                // 1. Kalite Kararı
                boolean isPass = dto.isCapOk() && dto.isLabelOk() && dto.isLiquidLevelOk();
                String result = isPass ? "PASS" : "FAIL";

                BottleInspection entity = BottleInspection.builder()
                        .lineCode(dto.getLineCode())
                        .capOk(dto.isCapOk())
                        .labelOk(dto.isLabelOk())
                        .liquidLevelOk(dto.isLiquidLevelOk())
                        .overallResult(result)
                        .imagePath(dto.getImagePath())
                        .inspectedAt(LocalDateTime.now())
                        .build();

                // 2. Anlık Kritik Kontrol (Hatalı Şişe İkazı)
                if (!isPass) {
                    log.warn("HATALI ÜRÜN TESPİT EDİLDİ! Hat: {}, Kapak: {}, Etiket: {}, Sıvı: {}",
                            dto.getLineCode(), dto.isCapOk(), dto.isLabelOk(), dto.isLiquidLevelOk());
                }

                // 3. Redis In-Memory Kuyruğuna Ekleme (Non-blocking)
                String json = objectMapper.writeValueAsString(entity);
                redisTemplate.opsForList().rightPush(REDIS_BUFFER_KEY, json).subscribe();

            } catch (Exception e) {
                log.error("Inspection işleme hatası: ", e);
            }
        }).subscribeOn(Schedulers.boundedElastic()).then();
    }

    @Override
    public Flux<BottleInspection> getRecentFailures() {
        return Mono.fromCallable(() -> repository.findTop20ByOverallResultOrderByInspectedAtDesc("FAIL"))
                .flatMapMany(Flux::fromIterable)
                .subscribeOn(Schedulers.boundedElastic());
    }

    @Override
    public Mono<List<BottleInspection>> saveBatch(List<BottleInspection> inspections) {
        return Mono.fromCallable(() -> repository.saveAll(inspections))
                .subscribeOn(Schedulers.boundedElastic());
    }
}