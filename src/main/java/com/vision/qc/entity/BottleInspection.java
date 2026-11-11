package com.vision.qc.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name="bottle_inspections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BottleInspection {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, unique=true) private UUID eventId;
    @Column(nullable=false,length=50) private String lineCode;
    @Column(nullable=false,length=80) private String cameraId;
    @JsonIgnore @Column(nullable=false) private Boolean capOk;
    @JsonIgnore @Column(nullable=false) private Boolean labelOk;
    @JsonIgnore @Column(nullable=false) private Boolean liquidLevelOk;
    @Column(nullable=false,length=10) private String overallResult;
    @Column(nullable=false) private Boolean bottleFound;
    private Double confidence;
    @Column(nullable=false,length=80) private String modelVersion;
    @Column(nullable=false,length=10) private String source;
    @Column(nullable=false,length=100) private String defects;
    @JsonIgnore @Column(length=64) private String payloadHash;
    @JsonIgnore private String imagePath;
    @Column(nullable=false) private LocalDateTime inspectedAt;
    private Long productionSessionId;
    private Long productNumber;
}
