package com.vision.qc.service;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.entity.ProductionSession;
import com.vision.qc.repository.*;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service @RequiredArgsConstructor
public class ProductionService {
    private final ProductionSessionRepository sessions;
    private final BottleInspectionRepository inspections;
    private final InspectionLedger ledger;
    private final ObjectMapper mapper;
    private final Validator validator;
    public record ProductRequest(Long expectedProductNumber, Boolean uncertain, BottleInspectionDto inspection) {}
    public record ProductResult(long productNumber, String decision, boolean duplicate, ProductionSession session) {}
    @Transactional public ProductionSession start() {
        if (sessions.findByActiveTrue().isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT,"A production session is already active");
        return sessions.saveAndFlush(ProductionSession.builder().active(true).startedAt(Instant.now()).build());
    }
    @Transactional public ProductionSession stop(long id) {
        var session = sessions.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(Boolean.TRUE.equals(session.getActive())) { session.setActive(null); session.setEndedAt(Instant.now()); }
        return session;
    }
    @Transactional public ProductResult record(long id, ProductRequest request) {
        var dto = request.inspection();
        if(dto == null || request.uncertain() == null || request.expectedProductNumber() == null || request.expectedProductNumber()<1 || !validator.validate(dto).isEmpty() || dto.source()!=BottleInspectionDto.Source.CAMERA || !dto.bottleFound())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid camera product");
        if(dto.capturedAt().isAfter(Instant.now().plusSeconds(300)) || dto.defects().stream().distinct().count()!=dto.defects().size())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid capture or defects");
        String hash;
        try { hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(request))); }
        catch(NoSuchAlgorithmException | JsonProcessingException e) {throw new IllegalStateException(e);}
        var s=sessions.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String verdict=Boolean.TRUE.equals(request.uncertain()) ? "REVIEW" : ledger.verdict(dto);
        if(dto.eventId().equals(s.getLastEventId())) {
            if(!hash.equals(s.getLastPayloadHash())) throw new ResponseStatusException(HttpStatus.CONFLICT,"eventId already belongs to another payload");
            return new ProductResult(s.getTotalCount(),verdict,true,s);
        }
        if(!Boolean.TRUE.equals(s.getActive())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Production session is closed");
        if(request.expectedProductNumber()!=s.getTotalCount()+1) throw new ResponseStatusException(HttpStatus.CONFLICT,"Product sequence is out of date");
        s.setTotalCount(s.getTotalCount()+1);
        switch(verdict) {case "PASS" -> s.setPassCount(s.getPassCount()+1); case "FAIL" -> s.setFailCount(s.getFailCount()+1); default -> s.setReviewCount(s.getReviewCount()+1);}
        if(!verdict.equals("PASS")) {
            if(inspections.findByEventId(dto.eventId()).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Event ID already exists");
            var record=ledger.record(dto, Boolean.TRUE.equals(request.uncertain()));
            if(record.getProductionSessionId()!=null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Event already belongs to a production session");
            record.setProductionSessionId(s.getId()); record.setProductNumber(s.getTotalCount()); inspections.save(record);
        }
        s.setLastEventId(dto.eventId()); s.setLastPayloadHash(hash);
        return new ProductResult(s.getTotalCount(),verdict,false,s);
    }
}
