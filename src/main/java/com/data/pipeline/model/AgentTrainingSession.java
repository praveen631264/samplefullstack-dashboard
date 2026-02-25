package com.data.pipeline.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentTrainingSession {
    private String sessionId;
    private String makerPrompt;
    private String checkerPrompt;
    private String comparePrompt;

    private String makerResult;
    private String checkerResult;
    private String compareResult;

    private String status; // e.g., "INITIAL", "MAKER_PROCESSING", "MAKER_DONE", "SAVED"
    private LocalDateTime updatedAt = LocalDateTime.now(ZoneId.of("America/New_York"));
}
