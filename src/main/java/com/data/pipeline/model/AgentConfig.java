package com.data.pipeline.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "agent_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_name", unique = true, nullable = false)
    private String agentName;

    @Column(name = "maker_prompt", columnDefinition = "TEXT")
    private String makerPrompt;

    @Column(name = "checker_prompt", columnDefinition = "TEXT")
    private String checkerPrompt;

    @Column(name = "compare_prompt", columnDefinition = "TEXT")
    private String comparePrompt;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now(ZoneId.of("America/New_York"));

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now(ZoneId.of("America/New_York"));
}
