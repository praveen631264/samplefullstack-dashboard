package com.data.pipeline.service;

import com.data.pipeline.model.AgentTrainingSession;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AgentTrainingService {

    private final Map<String, AgentTrainingSession> sessions = new ConcurrentHashMap<>();

    public AgentTrainingSession getOrCreateSession(String sessionId) {
        return sessions.computeIfAbsent(sessionId, id -> {
            AgentTrainingSession session = new AgentTrainingSession();
            session.setSessionId(id);
            session.setStatus("INITIAL");
            return session;
        });
    }

    public void updateMakerResult(String sessionId, String result) {
        AgentTrainingSession session = sessions.get(sessionId);
        if (session != null) {
            session.setMakerResult(result);
            session.setStatus("MAKER_DONE");
            session.setUpdatedAt(LocalDateTime.now(ZoneId.of("America/New_York")));
        }
    }

    public void updateCheckerResult(String sessionId, String result) {
        AgentTrainingSession session = sessions.get(sessionId);
        if (session != null) {
            session.setCheckerResult(result);
            session.setStatus("CHECKER_DONE");
            session.setUpdatedAt(LocalDateTime.now(ZoneId.of("America/New_York")));
        }
    }

    public void updateCompareResult(String sessionId, String result) {
        AgentTrainingSession session = sessions.get(sessionId);
        if (session != null) {
            session.setCompareResult(result);
            session.setStatus("COMPARE_DONE");
            session.setUpdatedAt(LocalDateTime.now(ZoneId.of("America/New_York")));
        }
    }

    public void savePrompts(String sessionId, String maker, String checker, String compare) {
        AgentTrainingSession session = sessions.get(sessionId);
        if (session != null) {
            if (maker != null)
                session.setMakerPrompt(maker);
            if (checker != null)
                session.setCheckerPrompt(checker);
            if (compare != null)
                session.setComparePrompt(compare);
            session.setUpdatedAt(LocalDateTime.now(ZoneId.of("America/New_York")));
        }
    }
}
