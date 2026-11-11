package com.vision.qc.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="production_sessions") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductionSession {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(unique=true) private Boolean active;
    @Column(nullable=false) private Instant startedAt;
    private Instant endedAt;
    @Column(nullable=false) private long totalCount;
    @Column(nullable=false) private long passCount;
    @Column(nullable=false) private long failCount;
    @Column(nullable=false) private long reviewCount;
    private UUID lastEventId;
    @Column(length=64) private String lastPayloadHash;
}
