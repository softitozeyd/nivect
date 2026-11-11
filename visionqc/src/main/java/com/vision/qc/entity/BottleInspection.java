package com.vision.qc.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bottle_inspections")
@Getter
@Setter
@NoArgsConstructor    // Builder ve JPA için şart
@AllArgsConstructor   // Builder için şart
@Builder              // builder() metodunu üreten Lombok anotasyonu
public class BottleInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String lineCode;

    @Column(nullable = false)
    private Boolean capOk;

    @Column(nullable = false)
    private Boolean labelOk;

    @Column(nullable = false)
    private Boolean liquidLevelOk;

    @Column(nullable = false, length = 10)
    private String overallResult;

    private String imagePath;

    @Column(nullable = false)
    private LocalDateTime inspectedAt;
}