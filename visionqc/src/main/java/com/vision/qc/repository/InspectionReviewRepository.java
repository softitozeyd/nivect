package com.vision.qc.repository;
import com.vision.qc.entity.InspectionReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InspectionReviewRepository extends JpaRepository<InspectionReview, String> {
    List<InspectionReview> findTop500ByOrderByUpdatedAtDesc();
}
