package com.data.pipeline.repository;

import com.data.pipeline.model.WorkflowExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecution, String> {
}
