package com.data.pipeline.service;

import com.data.pipeline.model.WorkflowExecution;
import com.data.pipeline.model.AuditTrail;
import com.data.pipeline.repository.WorkflowExecutionRepository;
import com.data.pipeline.repository.AuditTrailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
        return createWorkflow(description, s1Name, s2Name, null, null);
    }

    public WorkflowExecution createWorkflow(String description, String s1Name, String s2Name, byte[] s1Data, byte[] s2Data) {
        WorkflowExecution wf = new WorkflowExecution();
        wf.setWorkflowId(generateWorkflowId());
        wf.setDescription(description);
        wf.setSource1FileName(s1Name);
        wf.setSource2FileName(s2Name);
        wf.setSource1FileData(s1Data);
        wf.setSource2FileData(s2Data);
        wf.setStatus("STARTED");
        wf.setCreatedAt(LocalDateTime.now(ZoneId.of("UTC")));
        wf.setUpdatedAt(LocalDateTime.now(ZoneId.of("UTC")));

        WorkflowExecution saved = workflowRepository.save(wf);
        logAudit(saved.getWorkflowId(), "WORKFLOW_CREATED", "Started workflow for: " + description);
        return saved;
    }

    public Optional<WorkflowExecution> getWorkflow(String workflowId) {
        return workflowRepository.findById(workflowId);
    }

    public Optional<WorkflowExecution> updateStatus(String workflowId, String status) {
        return updateStatus(workflowId, status, null, null, null);
    }

    public Optional<WorkflowExecution> updateStatus(String workflowId, String status, String eventType, String cusip, String eventId) {
        String normalizedStatus = "COMPLETED_WITH_FAILURE".equals(status) ? "COMPLETED" : status;
        if ("EVENT_CREATED".equals(normalizedStatus)) {
            normalizedStatus = "VERIFYING";
        }
        final String finalStatus = normalizedStatus;
        return workflowRepository.findById(workflowId).map(wf -> {
            int currentRank = statusRank(wf.getStatus());
            int newRank = statusRank(finalStatus);
            if (newRank < currentRank) {
                return wf;
            }
            wf.setStatus(finalStatus);
            wf.setUpdatedAt(LocalDateTime.now(ZoneId.of("UTC")));
            if (eventType != null) wf.setEventType(eventType);
            if (cusip != null) wf.setCusip(cusip);
            if (eventId != null) wf.setEventId(eventId);
            logAudit(workflowId, "STATUS_" + finalStatus, "Status updated to " + finalStatus);
            return workflowRepository.save(wf);
        });
    }

    public void logAudit(String workflowId, String action, String details) {
        AuditTrail audit = new AuditTrail();
        audit.setWorkflowId(workflowId);
        audit.setAction(action);
        audit.setDetails(details);
        audit.setCreatedAt(LocalDateTime.now(ZoneId.of("UTC")));
        audit.setCreatedAt(LocalDateTime.now(ZoneId.of("UTC")));
        auditRepository.save(audit);
    }

    public List<AuditTrail> getAuditTrail() {
        return auditRepository.findAllByOrderByCreatedAtDesc();
    }

    private int statusRank(String status) {
        if (status == null) return 0;
        switch (status) {
            case "STARTED": return 1;
            case "PARSING": return 2;
            case "VERIFYING": return 3;
            case "COMPLETED": return 4;
            default: return 0;
        }
    }

    private synchronized String generateWorkflowId() {
        String datePrefix = "EVT-" + LocalDate.now(ZoneId.of("America/New_York")).format(DateTimeFormatter.ofPattern("ddMMyyyy"));
        long count = workflowRepository.countByWorkflowIdStartingWith(datePrefix);
        long sequence = count + 1;
        return datePrefix + "-" + String.format("%03d", sequence);
    }
}
