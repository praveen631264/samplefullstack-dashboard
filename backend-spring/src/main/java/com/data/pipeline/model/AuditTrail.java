package com.data.pipeline.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_trails")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditTrail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String workflowId;
    private String action;
    
    @Column(columnDefinition = "TEXT")
    private String details;
    
    private LocalDateTime createdAt = LocalDateTime.now();
}
