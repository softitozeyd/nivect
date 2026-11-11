package com.vision.qc.repository;
import com.vision.qc.entity.ProductionSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ProductionSessionRepository extends JpaRepository<ProductionSession, Long> {
    Optional<ProductionSession> findByActiveTrue();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ProductionSession s where s.id = :id")
    Optional<ProductionSession> lockById(@Param("id") Long id);
    Optional<ProductionSession> findTopByOrderByIdDesc();
}
