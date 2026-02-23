package com.data.pipeline.service;

import com.data.pipeline.model.SampleEvent;
import com.data.pipeline.repository.SampleEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SampleEventService {

    @Autowired
    private SampleEventRepository repository;

    public List<SampleEvent> getAllEvents() {
        return repository.findAll();
    }

    public List<SampleEvent> getEventsByStatus(String status) {
        return repository.findAll().stream()
                .filter(e -> status.equalsIgnoreCase(e.getStatus()))
                .collect(Collectors.toList());
    }

    public Optional<SampleEvent> getEventById(String eventId) {
        return repository.findByEventId(eventId);
    }

    public SampleEvent saveEvent(SampleEvent event) {
        return repository.save(event);
    }

    public Map<String, Object> getStats() {
        List<SampleEvent> events = repository.findAll();
        return Map.of(
                "total", events.size(),
                "byStatus",
                events.stream().collect(Collectors.groupingBy(SampleEvent::getStatus, Collectors.counting())),
                "byType",
                events.stream().collect(Collectors.groupingBy(SampleEvent::getEventType, Collectors.counting())));
    }
}
