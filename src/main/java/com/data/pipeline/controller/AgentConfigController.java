package com.data.pipeline.controller;

import com.data.pipeline.model.AgentConfig;
import com.data.pipeline.service.AgentConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/agents")
@Tag(name = "Agents", description = "AI Agent configuration management")
public class AgentConfigController {

    @Autowired
    private AgentConfigService agentService;

    @GetMapping
    public List<Map<String, Object>> getAllAgents() {
        return agentService.getAllAgents().stream().map(this::toSummary).collect(Collectors.toList());
    }

    @GetMapping("/{agentName}")
    public ResponseEntity<Map<String, Object>> getAgent(@PathVariable String agentName) {
        return agentService.getByName(agentName)
                .map(a -> ResponseEntity.ok(toSummary(a)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createAgent(
            @RequestParam("agentName") String agentName,
            @RequestParam(value = "makerPrompt", required = false) String makerPrompt,
            @RequestParam(value = "checkerPrompt", required = false) String checkerPrompt,
            @RequestParam(value = "comparePrompt", required = false) String comparePrompt,
            @RequestParam(value = "makerFile", required = false) MultipartFile makerFile,
            @RequestParam(value = "checkerFile", required = false) MultipartFile checkerFile) {

        if (agentName == null || agentName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Agent name is required"));
        }
        if (agentService.exists(agentName.trim())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Agent name already exists"));
        }

        try {
            AgentConfig config = new AgentConfig();
            config.setAgentName(agentName.trim());
            config.setMakerPrompt(makerPrompt);
            config.setCheckerPrompt(checkerPrompt);
            config.setComparePrompt(comparePrompt);

            if (makerFile != null && !makerFile.isEmpty()) {
                config.setMakerFileName(makerFile.getOriginalFilename());
                config.setMakerFileData(makerFile.getBytes());
            }
            if (checkerFile != null && !checkerFile.isEmpty()) {
                config.setCheckerFileName(checkerFile.getOriginalFilename());
                config.setCheckerFileData(checkerFile.getBytes());
            }

            AgentConfig saved = agentService.save(config);
            return ResponseEntity.ok(toSummary(saved));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to save agent: " + e.getMessage()));
        }
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createAgentJson(@RequestBody AgentConfig config) {
        if (config.getAgentName() == null || config.getAgentName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Agent name is required"));
        }
        if (agentService.exists(config.getAgentName().trim())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Agent name already exists"));
        }
        config.setAgentName(config.getAgentName().trim());
        AgentConfig saved = agentService.save(config);
        return ResponseEntity.ok(toSummary(saved));
    }

    @GetMapping("/{id}/file/{type}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable Long id, @PathVariable String type) {
        return agentService.getById(id).map(agent -> {
            byte[] data;
            String fileName;
            if ("maker".equals(type)) {
                data = agent.getMakerFileData();
                fileName = agent.getMakerFileName();
            } else if ("checker".equals(type)) {
                data = agent.getCheckerFileData();
                fileName = agent.getCheckerFileName();
            } else {
                return ResponseEntity.badRequest().<byte[]>build();
            }

            if (data == null || fileName == null) {
                return ResponseEntity.notFound().<byte[]>build();
            }

            String contentType = fileName.endsWith(".pdf") ? "application/pdf"
                    : fileName.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/octet-stream";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(data);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAgent(@PathVariable Long id, @RequestBody AgentConfig config) {
        config.setId(id);
        AgentConfig saved = agentService.save(config);
        return ResponseEntity.ok(toSummary(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAgent(@PathVariable Long id) {
        agentService.delete(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    private Map<String, Object> toSummary(AgentConfig a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId());
        map.put("agentName", a.getAgentName());
        map.put("makerPrompt", a.getMakerPrompt());
        map.put("checkerPrompt", a.getCheckerPrompt());
        map.put("comparePrompt", a.getComparePrompt());
        map.put("makerFileName", a.getMakerFileName());
        map.put("checkerFileName", a.getCheckerFileName());
        map.put("createdAt", a.getCreatedAt());
        map.put("updatedAt", a.getUpdatedAt());
        return map;
    }
}
