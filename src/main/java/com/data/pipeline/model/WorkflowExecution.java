package com.data.pipeline.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.time.ZoneId;

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

    @Lob
    @JsonIgnore
    @Column(name = "source1_file_data")
    private byte[] source1FileData;

    @Lob
    @JsonIgnore
    @Column(name = "source2_file_data")
    private byte[] source2FileData;

    private String eventId;
    private String cusip;
    private String eventType;

    private LocalDateTime createdAt = LocalDateTime.now(ZoneId.of("America/New_York"));
    private LocalDateTime updatedAt = LocalDateTime.now(ZoneId.of("America/New_York"));
}
