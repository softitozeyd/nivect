package com.vision.qc.repository;
import com.vision.qc.entity.ModelDetection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ModelDetectionRepository extends JpaRepository<ModelDetection, Long> {
    List<ModelDetection> findTop100ByOrderByRecordedAtDescIdDesc();
}
