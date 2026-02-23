package com.data.pipeline.service;

import com.data.pipeline.model.WorkflowExecution;
import com.data.pipeline.model.AuditTrail;
import com.data.pipeline.repository.WorkflowExecutionRepository;
import com.data.pipeline.repository.AuditTrailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class WorkflowService {

    @Autowired
    private WorkflowExecutionRepository workflowRepository;

    @Autowired
    private AuditTrailRepository auditRepository;

    public List<WorkflowExecution> getAllWorkflows() {
        return workflowRepository.findAll();
    }

    public WorkflowExecution createWorkflow(String description, String s1Name, String s2Name) {
        WorkflowExecution wf = new WorkflowExecution();
        wf.setWorkflowId(UUID.randomUUID().toString());
        wf.setDescription(description);
        wf.setSource1FileName(s1Name);
        wf.setSource2FileName(s2Name);
        wf.setStatus("STARTED");
        wf.setCreatedAt(LocalDateTime.now());
        wf.setUpdatedAt(LocalDateTime.now());

        WorkflowExecution saved = workflowRepository.save(wf);
        logAudit(saved.getWorkflowId(), "WORKFLOW_CREATED", "Started workflow for: " + description);
        return saved;
    }

    public Optional<WorkflowExecution> updateStatus(String workflowId, String status) {
        return workflowRepository.findById(workflowId).map(wf -> {
            wf.setStatus(status);
            wf.setUpdatedAt(LocalDateTime.now());
            logAudit(workflowId, "STATUS_" + status, "Status updated to " + status);
            return workflowRepository.save(wf);
        });
    }

    public void logAudit(String workflowId, String action, String details) {
        AuditTrail audit = new AuditTrail();
        audit.setWorkflowId(workflowId);
        audit.setAction(action);
        audit.setDetails(details);
        audit.setCreatedAt(LocalDateTime.now());
        audit.setCreatedAt(LocalDateTime.now());
        auditRepository.save(audit);
    }

    public List<AuditTrail> getAuditTrail() {
        return auditRepository.findAllByOrderByCreatedAtDesc();
    }
}
