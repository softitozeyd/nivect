package com.vision.qc.repository;

import com.vision.qc.entity.BottleInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BottleInspectionRepository extends JpaRepository<BottleInspection, Long> {

    // Üretim hattına ve tarih aralığına göre sorgulama
    List<BottleInspection> findByLineCodeAndInspectedAtBetween(
            String lineCode, LocalDateTime start, LocalDateTime end);

    List<BottleInspection> findTop100ByOrderByInspectedAtDescIdDesc();

    // Son hatalı (FAIL) ürünleri getirme
    List<BottleInspection> findTop20ByOverallResultOrderByInspectedAtDesc(String overallResult);
}