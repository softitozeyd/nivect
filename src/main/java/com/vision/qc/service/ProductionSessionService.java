package com.vision.qc.service;
import com.vision.qc.entity.ModelDetection;
import com.vision.qc.entity.ProductionSession;
import com.vision.qc.repository.ModelDetectionRepository;
import com.vision.qc.repository.ProductionSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ProductionSessionService {
    private final ProductionSessionRepository sessions;
    private final ModelDetectionRepository detections;
    private static final Set<String> DEFECTS = Set.of("underfill", "missing_cap", "loose_cap");
    public record ProductRequest(String eventId, Long expectedProductNumber, String decision, List<String> defects) {}
    public record ProductResponse(long productNumber, String decision, boolean duplicate, ProductionSession session) {}

    @Transactional
    public ProductionSession start() {
        if (sessions.findByActiveTrue().isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Active session already exists");
        return sessions.saveAndFlush(ProductionSession.builder().active(true).startedAt(Instant.now()).build());
    }
    @Transactional
    public ProductionSession stop(Long id) {
        ProductionSession session = sessions.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (Boolean.TRUE.equals(session.getActive())) { session.setActive(null); session.setEndedAt(Instant.now()); }
        return session;
    }
    @Transactional
    public ProductResponse record(Long id, ProductRequest request) {
        try { UUID.fromString(request.eventId()); } catch (RuntimeException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid event ID"); }
        if (request.expectedProductNumber() == null || request.expectedProductNumber() < 1 || request.decision() == null || !Set.of("PASS", "FAIL", "REVIEW").contains(request.decision()) || request.defects() == null || request.defects().size() > 3 || request.defects().stream().anyMatch(d -> d == null || !DEFECTS.contains(d)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid decision or defects");
        if ((request.decision().equals("FAIL") && request.defects().isEmpty()) || (!request.decision().equals("FAIL") && !request.defects().isEmpty()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inconsistent decision and defects");
        String defects = String.join(",", new TreeSet<>(request.defects()));
        ProductionSession session = sessions.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (request.eventId().equals(session.getLastEventId())) {
            if (request.expectedProductNumber() != session.getTotalCount() || !request.decision().equals(session.getLastEventDecision()) || !defects.equals(session.getLastEventDefects())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Event ID already used for another result");
            return new ProductResponse(session.getTotalCount(), request.decision(), true, session);
        }
        if (!Boolean.TRUE.equals(session.getActive())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Session is closed");
        if (request.expectedProductNumber() != session.getTotalCount() + 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Product sequence is out of date");
        session.setTotalCount(session.getTotalCount() + 1);
        switch (request.decision()) {
            case "PASS" -> session.setPassCount(session.getPassCount() + 1);
            case "FAIL" -> session.setDefectCount(session.getDefectCount() + 1);
            case "REVIEW" -> session.setUncertainCount(session.getUncertainCount() + 1);
            default -> throw new IllegalStateException();
        }
        session.setLastEventId(request.eventId()); session.setLastEventDecision(request.decision()); session.setLastEventDefects(defects);
        if (!request.decision().equals("PASS")) detections.save(ModelDetection.builder().defects(defects.isEmpty() ? "uncertain" : defects)
                .recordedAt(Instant.now()).sessionId(session.getId()).productNumber(session.getTotalCount()).modelDecision(request.decision()).build());
        return new ProductResponse(session.getTotalCount(), request.decision(), false, session);
    }
}
