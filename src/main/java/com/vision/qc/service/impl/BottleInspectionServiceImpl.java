package com.vision.qc.service.impl;

import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.entity.BottleInspection;
import com.vision.qc.repository.BottleInspectionRepository;
import com.vision.qc.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.*;
import reactor.core.scheduler.Schedulers;

@Service @RequiredArgsConstructor
public class BottleInspectionServiceImpl implements BottleInspectionService {
    private final InspectionLedger ledger;
    private final BottleInspectionRepository repository;
    public Mono<BottleInspection> processInspection(BottleInspectionDto dto) {
        return Mono.fromCallable(() -> ledger.record(dto)).subscribeOn(Schedulers.boundedElastic());
    }
    public Flux<BottleInspection> getRecentFailures() {
        return Mono.fromCallable(() -> repository.findTop20ByOverallResultOrderByInspectedAtDesc("FAIL"))
            .subscribeOn(Schedulers.boundedElastic()).flatMapMany(Flux::fromIterable);
    }
}
