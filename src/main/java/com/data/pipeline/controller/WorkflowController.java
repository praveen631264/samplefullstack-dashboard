package com.data.pipeline.controller;

import com.data.pipeline.model.WorkflowExecution;
import com.data.pipeline.service.WorkflowService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
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

        String s1Name = source1 != null ? source1.getOriginalFilename() : "N/A";
        String s2Name = source2 != null ? source2.getOriginalFilename() : "N/A";

        WorkflowExecution wf = workflowService.createWorkflow(description, s1Name, s2Name);
        return ResponseEntity.ok(wf);
    }

    @PutMapping("/{workflowId}/status")
    public ResponseEntity<WorkflowExecution> updateStatus(
            @PathVariable String workflowId,
            @RequestBody Map<String, String> body) {

        String status = body.get("status");
        return workflowService.updateStatus(workflowId, status)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
