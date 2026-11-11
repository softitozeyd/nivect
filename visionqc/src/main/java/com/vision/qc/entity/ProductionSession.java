package com.vision.qc.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "production_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductionSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(unique = true) private Boolean active;
    @Column(nullable = false) private Instant startedAt;
    private Instant endedAt;
    @Column(nullable = false) private long totalCount;
    @Column(nullable = false) private long passCount;
    @Column(nullable = false) private long defectCount;
    @Column(nullable = false) private long uncertainCount;
    @Column(length = 36) private String lastEventId;
    @Column(length = 10) private String lastEventDecision;
    @Column(length = 100) private String lastEventDefects;
}
