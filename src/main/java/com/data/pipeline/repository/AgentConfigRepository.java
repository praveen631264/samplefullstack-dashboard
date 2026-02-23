package com.data.pipeline.repository;

import com.data.pipeline.model.AgentConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AgentConfigRepository extends JpaRepository<AgentConfig, Long> {
    Optional<AgentConfig> findByAgentName(String agentName);
    boolean existsByAgentName(String agentName);
}
