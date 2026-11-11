package com.vision.qc.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.repository.BottleInspectionRepository;
import com.vision.qc.service.impl.BottleInspectionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ReactiveListOperations;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.test.StepVerifier;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class BottleInspectionServiceTest {
    private ReactiveListOperations<String, String> list;
    private BottleInspectionServiceImpl service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ReactiveStringRedisTemplate redis = mock(ReactiveStringRedisTemplate.class);
        list = mock(ReactiveListOperations.class);
        when(redis.opsForList()).thenReturn(list);
        service = new BottleInspectionServiceImpl(mock(BottleInspectionRepository.class),
                redis, new ObjectMapper().findAndRegisterModules());
    }

    @Test
    void waitsForRedisWriteBeforeReportingSuccess() {
        Sinks.One<Long> written = Sinks.one();
        when(list.rightPush(anyString(), anyString())).thenReturn(written.asMono());
        AtomicBoolean completed = new AtomicBoolean();
        StepVerifier.create(service.processInspection(sample()).doOnSuccess(value -> completed.set(true)))
                .expectSubscription()
                .then(() -> assertFalse(completed.get()))
                .then(() -> written.tryEmitValue(1L))
                .verifyComplete();
    }

    @Test
    void propagatesRedisFailureInsteadOfReturningSuccess() {
        when(list.rightPush(anyString(), anyString()))
                .thenReturn(Mono.error(new IllegalStateException("redis unavailable")));
        StepVerifier.create(service.processInspection(sample()))
                .expectErrorMessage("redis unavailable")
                .verify();
    }

    private BottleInspectionDto sample() {
        return BottleInspectionDto.builder().lineCode("test-line")
                .capOk(true).labelOk(true).liquidLevelOk(true).build();
    }
}
