package com.vision.qc.repository;
import com.vision.qc.entity.ProductionSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
public interface ProductionSessionRepository extends JpaRepository<ProductionSession,Long> {
    Optional<ProductionSession> findByActiveTrue();
    Optional<ProductionSession> findTopByOrderByIdDesc();
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from ProductionSession s where s.id = :id")
    Optional<ProductionSession> lockById(@Param("id") Long id);
}
