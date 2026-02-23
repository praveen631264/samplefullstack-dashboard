package com.data.pipeline.controller;

import com.data.pipeline.model.SampleEvent;
import com.data.pipeline.service.SampleEventService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@Tag(name = "Events", description = "Sample Data Event management")
public class SampleEventController {

    @Autowired
    private SampleEventService eventService;

    @GetMapping
    public List<SampleEvent> getEvents(@RequestParam(required = false) String status) {
        if (status != null)
            return eventService.getEventsByStatus(status);
        return eventService.getAllEvents();
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<SampleEvent> getEvent(@PathVariable String eventId) {
        return eventService.getEventById(eventId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SampleEvent createEvent(@RequestBody SampleEvent event) {
        return eventService.saveEvent(event);
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        return eventService.getStats();
    }
}
