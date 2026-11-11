package com.vision.qc.service;

import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.entity.BottleInspection;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface BottleInspectionService {
    Mono<BottleInspection> processInspection(BottleInspectionDto dto);
    Flux<BottleInspection> getRecentFailures();
    Flux<BottleInspection> getRecentInspections();
}
