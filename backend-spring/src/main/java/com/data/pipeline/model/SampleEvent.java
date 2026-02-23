package com.data.pipeline.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sample_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Generic data event entity representing a sample record")
public class SampleEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", unique = true)
    private String eventId;

    @Column(nullable = false)
    private String cusip;

    @Column(name = "event_type")
    private String eventType;

    @Column(name = "principal_rate", precision = 15, scale = 4)
    private BigDecimal principalRate;

    @Column(name = "premium_rate", precision = 15, scale = 4)
    private BigDecimal premiumRate;

    @Column(name = "security_called_amount", precision = 20, scale = 2)
    private BigDecimal securityCalledAmount;

    @Column(name = "security_description", length = 500)
    private String securityDescription;

    @Column(name = "payable_date")
    private String payableDate;

    @Column(nullable = false)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "source1_data", columnDefinition = "TEXT")
    private String source1Data;

    @Column(name = "source2_data", columnDefinition = "TEXT")
    private String source2Data;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
