package com.data.pipeline.service;

import com.data.pipeline.model.AgentConfig;
import com.data.pipeline.repository.AgentConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AgentConfigService {

    @Autowired
    private AgentConfigRepository repository;

    public List<AgentConfig> getAllAgents() {
        return repository.findAll();
    }

    public Optional<AgentConfig> getByName(String agentName) {
        return repository.findByAgentName(agentName);
    }

    public Optional<AgentConfig> getById(Long id) {
        return repository.findById(id);
    }

    public boolean exists(String agentName) {
        return repository.existsByAgentName(agentName);
    }

    public AgentConfig save(AgentConfig config) {
        config.setUpdatedAt(LocalDateTime.now(java.time.ZoneId.of("UTC")));
        if (config.getCreatedAt() == null) {
            config.setCreatedAt(LocalDateTime.now(java.time.ZoneId.of("UTC")));
        }
        return repository.save(config);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
