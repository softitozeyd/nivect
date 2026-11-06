package com.vision.qc.repository;

import com.vision.qc.entity.BottleInspection;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface BottleInspectionRepository extends JpaRepository<BottleInspection,Long>, JpaSpecificationExecutor<BottleInspection> {
    List<BottleInspection> findTop100ByOrderByInspectedAtDescIdDesc();
    Optional<BottleInspection> findByEventId(UUID eventId);
    List<BottleInspection> findTop20ByOverallResultOrderByInspectedAtDesc(String overallResult);
}
