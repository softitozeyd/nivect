package com.vision.qc.controller;
import com.vision.qc.entity.InspectionReview;
import com.vision.qc.repository.InspectionReviewRepository;
import com.vision.qc.repository.BottleInspectionRepository;
import com.vision.qc.repository.ModelDetectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import java.time.Instant;
import java.util.Set;

@RestController @RequestMapping("/api/v1/reviews") @RequiredArgsConstructor
public class InspectionReviewController {
    private final InspectionReviewRepository reviews;
    private final BottleInspectionRepository inspections;
    private final ModelDetectionRepository detections;
    public record ReviewRequest(String outcome, String note) {}
    private static final Set<String> OUTCOMES = Set.of("confirmed", "false-positive", "flagged");

    @GetMapping
    public Flux<InspectionReview> recent() {
        return Mono.fromCallable(reviews::findTop500ByOrderByUpdatedAtDesc)
            .flatMapMany(Flux::fromIterable).subscribeOn(Schedulers.boundedElastic());
    }
    @PutMapping("/{recordId}")
    public Mono<InspectionReview> save(@PathVariable String recordId, @RequestBody ReviewRequest request) {
        if (!recordId.matches("(?:NIV|MD)-[1-9][0-9]{0,17}") || request.outcome() == null ||
            !OUTCOMES.contains(request.outcome()) || request.note() == null || request.note().length() > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid review");
        return Mono.fromCallable(() -> {
            long id = Long.parseLong(recordId.substring(recordId.indexOf('-') + 1));
            boolean exists = recordId.startsWith("MD-") ? detections.existsById(id) : inspections.existsById(id);
            if (!exists) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inspection not found");
            return reviews.save(InspectionReview.builder().recordId(recordId).outcome(request.outcome())
                .note(request.note()).updatedAt(Instant.now()).build());
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
