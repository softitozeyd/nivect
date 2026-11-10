package com.vision.qc.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "model_detections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ModelDetection {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 100) private String defects;
    @Column(nullable = false) private Instant recordedAt;
}
