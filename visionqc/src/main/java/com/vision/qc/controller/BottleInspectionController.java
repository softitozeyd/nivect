package com.vision.qc.controller;

import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.entity.BottleInspection;
import com.vision.qc.service.BottleInspectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/inspections")
@RequiredArgsConstructor
public class BottleInspectionController {

    private final BottleInspectionService inspectionService;

    // HTTP üzerinden manuel test veya HTTP gönderimi için
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Mono<Void> receiveInspection(@RequestBody BottleInspectionDto dto) {
        return inspectionService.processInspection(dto);
    }

    // Dashboard history: bounded to the 100 most recent saved records.
    @GetMapping
    public Flux<BottleInspection> getRecentInspections() {
        return inspectionService.getRecentInspections();
    }

    // Dashboard için son hatalı ürünleri getiren endpoint
    @GetMapping("/failures")
    public Flux<BottleInspection> getRecentFailures() {
        return inspectionService.getRecentFailures();
    }
}