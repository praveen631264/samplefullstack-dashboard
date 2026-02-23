package com.data.pipeline.repository;

import com.data.pipeline.model.WorkflowExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecution, String> {
    List<WorkflowExecution> findAllByOrderByCreatedAtDesc();

    @Query("SELECT COUNT(w) FROM WorkflowExecution w WHERE w.workflowId LIKE :prefix%")
    long countByWorkflowIdStartingWith(@Param("prefix") String prefix);
}
