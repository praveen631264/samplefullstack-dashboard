package com.data.pipeline.repository;

import com.data.pipeline.model.AuditTrail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditTrailRepository extends JpaRepository<AuditTrail, Long> {
    List<AuditTrail> findByWorkflowId(String workflowId);

    List<AuditTrail> findAllByOrderByCreatedAtDesc();
}
