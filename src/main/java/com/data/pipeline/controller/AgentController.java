package com.data.pipeline.controller;

import com.data.pipeline.model.AgentConfig;
import com.data.pipeline.repository.AgentConfigRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/agents")
@Tag(name = "Agents", description = "AI Agent configuration management")
public class AgentController {

    @Autowired
    private AgentConfigRepository agentRepository;

    @GetMapping
    public List<AgentConfig> getAgents() {
        return agentRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> saveAgent(@RequestBody AgentConfig agent) {
        if (agent.getAgentName() == null || agent.getAgentName().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Agent name is required"));
        }

        if (agentRepository.existsByAgentName(agent.getAgentName())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Agent with this name already exists"));
        }

        agent.setCreatedAt(LocalDateTime.now());
        agent.setUpdatedAt(LocalDateTime.now());
        AgentConfig saved = agentRepository.save(agent);
        return ResponseEntity.ok(saved);
    }
}
