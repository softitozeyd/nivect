package com.vision.qc.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "inspection_reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InspectionReview {
    @Id @Column(length = 40) private String recordId;
    @Column(nullable = false, length = 20) private String outcome;
    @Column(nullable = false, length = 500) private String note;
    @Column(nullable = false) private Instant updatedAt;
}
