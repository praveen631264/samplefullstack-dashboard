package com.data.pipeline.service;

import com.data.pipeline.model.WorkflowExecution;
import com.data.pipeline.model.AuditTrail;
import com.data.pipeline.repository.WorkflowExecutionRepository;
import com.data.pipeline.repository.AuditTrailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
public class WorkflowService {

    @Autowired
    private WorkflowExecutionRepository workflowRepository;

    @Autowired
    private AuditTrailRepository auditRepository;

    public List<WorkflowExecution> getAllWorkflows() {
        return workflowRepository.findAllByOrderByCreatedAtDesc();
    }

    public WorkflowExecution createWorkflow(String description, String s1Name, String s2Name) {
        WorkflowExecution wf = new WorkflowExecution();
        wf.setWorkflowId(generateWorkflowId());
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
        return updateStatus(workflowId, status, null, null, null);
    }

    public Optional<WorkflowExecution> updateStatus(String workflowId, String status, String eventType, String cusip, String eventId) {
        String normalizedStatus = "COMPLETED_WITH_FAILURE".equals(status) ? "COMPLETED" : status;
        return workflowRepository.findById(workflowId).map(wf -> {
            wf.setStatus(normalizedStatus);
            wf.setUpdatedAt(LocalDateTime.now());
            if (eventType != null) wf.setEventType(eventType);
            if (cusip != null) wf.setCusip(cusip);
            if (eventId != null) wf.setEventId(eventId);
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

    private synchronized String generateWorkflowId() {
        String datePrefix = "EVT-" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"));
        long count = workflowRepository.countByWorkflowIdStartingWith(datePrefix);
        long sequence = count + 1;
        return datePrefix + "-" + String.format("%03d", sequence);
    }
}
