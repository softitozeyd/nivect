package com.vision.qc.service;
import com.vision.qc.entity.ProductionSession;
import com.vision.qc.entity.ModelDetection;
import com.vision.qc.repository.ProductionSessionRepository;
import com.vision.qc.repository.ModelDetectionRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductionSessionServiceTest {
    @Test void countsOnceAndStoresOnlyDefectiveOrUncertain() {
        var sessions = mock(ProductionSessionRepository.class);
        var detections = mock(ModelDetectionRepository.class);
        var session = ProductionSession.builder().id(7L).active(true).build();
        when(sessions.lockById(7L)).thenReturn(Optional.of(session));
        var service = new ProductionSessionService(sessions, detections);
        var passId = UUID.randomUUID().toString();
        var pass = new ProductionSessionService.ProductRequest(passId, 1L, "PASS", List.of());
        assertFalse(service.record(7L, pass).duplicate());
        assertTrue(service.record(7L, pass).duplicate());
        verifyNoInteractions(detections);
        var fail = new ProductionSessionService.ProductRequest(UUID.randomUUID().toString(), 2L, "FAIL", List.of("missing_cap"));
        service.record(7L, fail);
        assertThrows(ResponseStatusException.class, () -> service.record(7L, pass));
        service.record(7L, new ProductionSessionService.ProductRequest(UUID.randomUUID().toString(), 3L, "REVIEW", List.of()));
        assertEquals(3, session.getTotalCount()); assertEquals(1, session.getPassCount());
        assertEquals(1, session.getDefectCount()); assertEquals(1, session.getUncertainCount());
        var captured = ArgumentCaptor.forClass(ModelDetection.class);
        verify(detections, times(2)).save(captured.capture());
        assertEquals("uncertain", captured.getAllValues().get(1).getDefects());
        assertEquals(3L, captured.getAllValues().get(1).getProductNumber());
    }
    @Test void rejectsInvalidRequestsAndClosedSessions() {
        var sessions = mock(ProductionSessionRepository.class);
        var detections = mock(ModelDetectionRepository.class);
        var session = ProductionSession.builder().id(7L).active(null).build();
        when(sessions.lockById(7L)).thenReturn(Optional.of(session));
        var service = new ProductionSessionService(sessions, detections);
        assertThrows(ResponseStatusException.class, () -> service.record(7L, new ProductionSessionService.ProductRequest(UUID.randomUUID().toString(), 1L, "PASS", List.of())));
        assertThrows(ResponseStatusException.class, () -> service.record(7L, new ProductionSessionService.ProductRequest(UUID.randomUUID().toString(), 1L, "FAIL", List.of())));
        verifyNoInteractions(detections);
    }
}
