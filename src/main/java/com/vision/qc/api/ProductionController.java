package com.vision.qc.api;
import com.vision.qc.entity.ProductionSession;
import com.vision.qc.repository.ProductionSessionRepository;
import com.vision.qc.service.ProductionService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import java.util.Map;
@RestController @RequestMapping("/api/v1/production-sessions") @RequiredArgsConstructor
public class ProductionController {
    private final ProductionSessionRepository sessions;
    private final ProductionService service;
    @GetMapping("/latest") public Mono<Map<String,ProductionSession>> latest() {return Mono.fromCallable(() -> {Map<String,ProductionSession> m=new java.util.HashMap<>();m.put("session",sessions.findTopByOrderByIdDesc().orElse(null));return m;}).subscribeOn(Schedulers.boundedElastic());}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Mono<ProductionSession> start() {return Mono.fromCallable(service::start).onErrorMap(DataIntegrityViolationException.class,e -> new ResponseStatusException(HttpStatus.CONFLICT,"A production session is already active")).subscribeOn(Schedulers.boundedElastic());}
    @PostMapping("/{id}/stop") public Mono<ProductionSession> stop(@PathVariable long id) {return Mono.fromCallable(() -> service.stop(id)).subscribeOn(Schedulers.boundedElastic());}
    @PostMapping("/{id}/products") public Mono<ProductionService.ProductResult> record(@PathVariable long id,@RequestBody ProductionService.ProductRequest request) {return Mono.fromCallable(() -> service.record(id,request)).subscribeOn(Schedulers.boundedElastic());}
}
