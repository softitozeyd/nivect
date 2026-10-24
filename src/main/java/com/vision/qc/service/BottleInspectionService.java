package com.vision.qc.service;

import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.entity.BottleInspection;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

public interface BottleInspectionService {
    Mono<Void> processInspection(BottleInspectionDto dto);
    Flux<BottleInspection> getRecentFailures();
    Mono<List<BottleInspection>> saveBatch(List<BottleInspection> inspections);
}