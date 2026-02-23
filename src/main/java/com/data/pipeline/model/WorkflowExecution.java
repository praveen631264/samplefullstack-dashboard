package com.data.pipeline.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "workflow_executions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowExecution {
    @Id
    private String workflowId;

    private String description;
    private String status;
    private String source1FileName;
    private String source2FileName;
    private String eventId;
    private String cusip;
    private String eventType;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
