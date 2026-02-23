package com.data.pipeline.controller;

import com.data.pipeline.model.AuditTrail;
import com.data.pipeline.service.WorkflowService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
@Tag(name = "Audit", description = "Data Processing Audit Trail")
public class AuditController {

    @Autowired
    private WorkflowService workflowService;

    @GetMapping
    public List<AuditTrail> getAuditTrail() {
        return workflowService.getAuditTrail();
    }
}
