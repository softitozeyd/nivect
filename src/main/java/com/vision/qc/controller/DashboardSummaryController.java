package com.vision.qc.controller;
import com.vision.qc.repository.BottleInspectionRepository;
import com.vision.qc.repository.ModelDetectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController @RequestMapping("/api/v1/summary") @RequiredArgsConstructor
public class DashboardSummaryController {
    private final BottleInspectionRepository inspections;
    private final ModelDetectionRepository detections;
    public record Summary(long legacyFailureRecords, long cameraDetectionRecords) {}
    @GetMapping
    public Mono<Summary> read() {
        return Mono.fromCallable(() -> new Summary(inspections.countByOverallResult("FAIL"), detections.count()))
            .subscribeOn(Schedulers.boundedElastic());
    }
}
