package com.vision.qc.service;

import com.vision.qc.service.impl.BottleInspectionServiceImpl;
import com.vision.qc.repository.BottleInspectionRepository;
import com.vision.qc.entity.BottleInspection;
import com.vision.qc.dto.BottleInspectionDto;
import org.junit.jupiter.api.Test;
import reactor.test.StepVerifier;
import java.time.Instant;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.test.util.ReflectionTestUtils;

class BottleInspectionServiceTest {
    BottleInspectionDto sample(boolean found,double confidence,List<BottleInspectionDto.Defect> defects) {
        return new BottleInspectionDto(UUID.randomUUID(),"line-1","pc-1",found,defects,confidence,"test-v1",BottleInspectionDto.Source.CAMERA,Instant.now());
    }
    @Test void neverPassesMissingBottleOrLowConfidence() {
        var ledger=new InspectionLedger(null,null,null,null);
        ReflectionTestUtils.setField(ledger,"minimumConfidence",0.65);
        assertEquals("REVIEW",ledger.verdict(sample(false,0.99,List.of())));
        assertEquals("REVIEW",ledger.verdict(sample(true,0.4,List.of())));
        assertEquals("FAIL",ledger.verdict(sample(true,0.9,List.of(BottleInspectionDto.Defect.underfill))));
        assertEquals("PASS",ledger.verdict(sample(true,0.9,List.of())));
    }
    @Test void waitsForDatabaseCommitAndPropagatesFailure() {
        var ledger=mock(InspectionLedger.class);
        var service=new BottleInspectionServiceImpl(ledger,mock(BottleInspectionRepository.class));
        var dto=sample(true,0.9,List.of());
        when(ledger.record(dto)).thenThrow(new IllegalStateException("database offline"));
        StepVerifier.create(service.processInspection(dto)).expectErrorMessage("database offline").verify();
        verify(ledger).record(dto);
    }
}
