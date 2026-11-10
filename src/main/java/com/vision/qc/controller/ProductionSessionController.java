package com.vision.qc.controller;
import com.vision.qc.entity.ProductionSession;
import com.vision.qc.repository.ProductionSessionRepository;
import com.vision.qc.service.ProductionSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController @RequestMapping("/api/v1/production-sessions") @RequiredArgsConstructor
public class ProductionSessionController {
    private final ProductionSessionRepository sessions;
    private final ProductionSessionService service;
    @GetMapping("/latest")
    public Mono<ProductionSession> latest() { return Mono.fromCallable(() -> sessions.findTopByOrderByIdDesc().orElse(null)).subscribeOn(Schedulers.boundedElastic()); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Mono<ProductionSession> start() { return Mono.fromCallable(service::start).onErrorMap(DataIntegrityViolationException.class, e -> new ResponseStatusException(HttpStatus.CONFLICT, "Active session already exists")).subscribeOn(Schedulers.boundedElastic()); }
    @PostMapping("/{id}/stop")
    public Mono<ProductionSession> stop(@PathVariable Long id) { return Mono.fromCallable(() -> service.stop(id)).subscribeOn(Schedulers.boundedElastic()); }
    @PostMapping("/{id}/products")
    public Mono<ProductionSessionService.ProductResponse> record(@PathVariable Long id, @RequestBody ProductionSessionService.ProductRequest request) { return Mono.fromCallable(() -> service.record(id, request)).subscribeOn(Schedulers.boundedElastic()); }
}
