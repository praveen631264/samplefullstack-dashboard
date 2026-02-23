package com.data.pipeline.controller;

import com.data.pipeline.model.AgentConfig;
import com.data.pipeline.service.AgentConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/agents")
@Tag(name = "Agents", description = "AI Agent configuration management")
public class AgentConfigController {

    @Autowired
    private AgentConfigService agentService;

    @GetMapping
    public List<AgentConfig> getAllAgents() {
        return agentService.getAllAgents();
    }

    @GetMapping("/{agentName}")
    public ResponseEntity<AgentConfig> getAgent(@PathVariable String agentName) {
        return agentService.getByName(agentName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createAgent(@RequestBody AgentConfig config) {
        if (config.getAgentName() == null || config.getAgentName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Agent name is required"));
        }
        if (agentService.exists(config.getAgentName().trim())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Agent name already exists"));
        }
        config.setAgentName(config.getAgentName().trim());
        AgentConfig saved = agentService.save(config);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAgent(@PathVariable Long id, @RequestBody AgentConfig config) {
        config.setId(id);
        AgentConfig saved = agentService.save(config);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAgent(@PathVariable Long id) {
        agentService.delete(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
