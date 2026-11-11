package com.vision.qc.controller;
import com.vision.qc.entity.ModelDetection;
import com.vision.qc.repository.ModelDetectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

@RestController
@RequestMapping("/api/v1/model-detections")
@RequiredArgsConstructor
public class ModelDetectionController {
    private final ModelDetectionRepository repository;
    private static final Set<String> ALLOWED = Set.of("underfill", "missing_cap", "loose_cap");
    public record DetectionRequest(List<String> defects) {}
    @GetMapping
    public Flux<ModelDetection> recent() {
        return Mono.fromCallable(repository::findTop100ByOrderByRecordedAtDescIdDesc)
            .flatMapMany(Flux::fromIterable).subscribeOn(Schedulers.boundedElastic());
    }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ModelDetection> create(@RequestBody DetectionRequest request) {
        if (request.defects() == null || request.defects().isEmpty() || request.defects().size() > 3 ||
                request.defects().stream().anyMatch(d -> d == null || !ALLOWED.contains(d)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid model defects");
        String defects = String.join(",", new TreeSet<>(request.defects()));
        return Mono.fromCallable(() -> repository.save(ModelDetection.builder().defects(defects)
            .recordedAt(Instant.now()).build())).subscribeOn(Schedulers.boundedElastic());
    }
}
