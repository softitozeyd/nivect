package com.vision.qc.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.entity.BottleInspection;
import com.vision.qc.repository.BottleInspectionRepository;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class InspectionLedger {
    private final BottleInspectionRepository repository;
    private final JdbcTemplate jdbc;
    private final Validator validator;
    private final ObjectMapper mapper;
    @Value("${qc.minimum-confidence:0.65}") private double minimumConfidence;

    @jakarta.annotation.PostConstruct
    void checkThreshold() { if(minimumConfidence<0 || minimumConfidence>1) throw new IllegalStateException("QC_MINIMUM_CONFIDENCE must be 0..1"); }

    public String verdict(BottleInspectionDto dto) {
        if (!dto.bottleFound() || dto.confidence() < minimumConfidence) return "REVIEW";
        return dto.defects().isEmpty() ? "PASS" : "FAIL";
    }

    @Transactional
    public BottleInspection record(BottleInspectionDto dto) {
        if (!validator.validate(dto).isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Inspection fields are missing or invalid");
        if (dto.capturedAt().isAfter(Instant.now().plusSeconds(300)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"capturedAt is in the future");
        if (new HashSet<>(dto.defects()).size()!=dto.defects().size())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Duplicate defect classes");
        try {
            String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(mapper.writeValueAsBytes(dto)));
            String defects = dto.defects().stream().map(Enum::name).sorted().collect(Collectors.joining(","));
            // PostgreSQL serializes concurrent retries on the unique event key. ACK follows commit.
            jdbc.update("""
                INSERT INTO bottle_inspections
                (event_id,line_code,camera_id,cap_ok,label_ok,liquid_level_ok,overall_result,
                 bottle_found,confidence,model_version,source,defects,payload_hash,inspected_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (event_id) DO NOTHING
                """,dto.eventId(),dto.lineCode(),dto.cameraId(),
                !dto.defects().contains(BottleInspectionDto.Defect.missing_cap)
                    && !dto.defects().contains(BottleInspectionDto.Defect.loose_cap),
                true,!dto.defects().contains(BottleInspectionDto.Defect.underfill),verdict(dto),
                dto.bottleFound(),dto.confidence(),dto.modelVersion(),dto.source().name(),defects,hash,
                LocalDateTime.ofInstant(dto.capturedAt(),ZoneOffset.UTC));
            BottleInspection saved=repository.findByEventId(dto.eventId()).orElseThrow();
            if (!hash.equals(saved.getPayloadHash()))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"eventId already belongs to a different payload");
            return saved;
        } catch (ResponseStatusException e) { throw e; }
        catch (java.security.NoSuchAlgorithmException | com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize inspection",e);
        }
    }
}
