package com.data.pipeline.controller;

import com.data.pipeline.model.WorkflowExecution;
import com.data.pipeline.service.WorkflowService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workflows")
@Tag(name = "Workflows", description = "Data Processing Workflow management")
public class WorkflowController {

    @Autowired
    private WorkflowService workflowService;

    @GetMapping
    public List<WorkflowExecution> getWorkflows() {
        return workflowService.getAllWorkflows();
    }

    @PostMapping
    public ResponseEntity<WorkflowExecution> createWorkflow(
            @RequestParam(required = false) String description,
            @RequestParam(required = false) MultipartFile source1,
            @RequestParam(required = false) MultipartFile source2) {

        try {
            String s1Name = source1 != null ? source1.getOriginalFilename() : "N/A";
            String s2Name = source2 != null ? source2.getOriginalFilename() : "N/A";
            byte[] s1Data = source1 != null ? source1.getBytes() : null;
            byte[] s2Data = source2 != null ? source2.getBytes() : null;

            WorkflowExecution wf = workflowService.createWorkflow(description, s1Name, s2Name, s1Data, s2Data);
            return ResponseEntity.ok(wf);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{workflowId}/status")
    public ResponseEntity<WorkflowExecution> updateStatus(
            @PathVariable String workflowId,
            @RequestBody Map<String, String> body) {

        String status = body.get("status");
        String eventType = body.get("eventType");
        String cusip = body.get("cusip");
        String eventId = body.get("eventId");
        return workflowService.updateStatus(workflowId, status, eventType, cusip, eventId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{workflowId}/file/{type}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String workflowId, @PathVariable String type) {
        return workflowService.getWorkflow(workflowId).map(wf -> {
            byte[] data;
            String fileName;
            if ("source1".equals(type)) {
                data = wf.getSource1FileData();
                fileName = wf.getSource1FileName();
            } else if ("source2".equals(type)) {
                data = wf.getSource2FileData();
                fileName = wf.getSource2FileName();
            } else {
                return ResponseEntity.badRequest().<byte[]>build();
            }

            if (data == null || fileName == null) {
                return ResponseEntity.notFound().<byte[]>build();
            }

            String contentType = fileName.endsWith(".pdf") ? "application/pdf"
                    : fileName.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : fileName.endsWith(".xls") ? "application/vnd.ms-excel"
                    : fileName.endsWith(".csv") ? "text/csv"
                    : "application/octet-stream";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(data);
        }).orElse(ResponseEntity.notFound().build());
    }
}
