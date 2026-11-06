package com.vision.qc.controller;

import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.entity.BottleInspection;
import com.vision.qc.service.BottleInspectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.*;

@RestController @RequestMapping("/api/v1/inspections") @RequiredArgsConstructor
public class BottleInspectionController {
    private final BottleInspectionService service;
    @PostMapping @ResponseStatus(HttpStatus.ACCEPTED)
    public Mono<BottleInspection> receiveInspection(@Valid @RequestBody BottleInspectionDto dto, Authentication auth) {
        boolean ingest=auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_INGEST"));
        if(ingest && dto.source()!=BottleInspectionDto.Source.CAMERA)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Camera credentials can only submit CAMERA events");
        return service.processInspection(dto);
    }
    @GetMapping
    public Flux<BottleInspection> getRecentInspections() {return service.getRecentInspections();}
    @GetMapping("/failures")
    public Flux<BottleInspection> getRecentFailures() {return service.getRecentFailures();}
}
