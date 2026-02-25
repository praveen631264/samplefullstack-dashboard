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

    @Autowired
    private com.data.pipeline.service.WorkflowService workflowService;

    @PostMapping
    public SampleEvent createEvent(@RequestBody SampleEvent event) {
        if (event.getEventId() == null || event.getEventId().isEmpty()) {
            event.setEventId(eventService.generateCaId());
        }
        if (event.getCreatedAt() == null) {
            event.setCreatedAt(java.time.LocalDateTime.now(java.time.ZoneId.of("America/New_York")));
        }
        SampleEvent saved = eventService.saveEvent(event);
        if (saved.getWorkflowId() != null && !saved.getWorkflowId().isEmpty()) {
            workflowService.updateStatus(saved.getWorkflowId(), "EVENT_CREATED",
                    saved.getEventType(), saved.getCusip(), saved.getEventId());
        }
        return saved;
    }

    @PutMapping("/{eventId}")
    public ResponseEntity<SampleEvent> updateEvent(@PathVariable String eventId, @RequestBody Map<String, Object> body) {
        return eventService.getEventById(eventId)
                .map(existing -> {
                    if (body.containsKey("status")) existing.setStatus((String) body.get("status"));
                    if (body.containsKey("eventType")) existing.setEventType((String) body.get("eventType"));
                    if (body.containsKey("cusip")) existing.setCusip((String) body.get("cusip"));
                    if (body.containsKey("remarks")) existing.setRemarks((String) body.get("remarks"));
                    if (body.containsKey("confidenceScore") && body.get("confidenceScore") != null)
                        existing.setConfidenceScore(Double.valueOf(body.get("confidenceScore").toString()));
                    if (body.containsKey("source1Data")) existing.setSource1Data((String) body.get("source1Data"));
                    if (body.containsKey("source2Data")) existing.setSource2Data((String) body.get("source2Data"));
                    if (body.containsKey("payableDate")) existing.setPayableDate((String) body.get("payableDate"));
                    if (body.containsKey("principalRate") && body.get("principalRate") != null)
                        existing.setPrincipalRate(new java.math.BigDecimal(body.get("principalRate").toString()));
                    if (body.containsKey("premiumRate") && body.get("premiumRate") != null)
                        existing.setPremiumRate(new java.math.BigDecimal(body.get("premiumRate").toString()));
                    if (body.containsKey("securityCalledAmount") && body.get("securityCalledAmount") != null)
                        existing.setSecurityCalledAmount(new java.math.BigDecimal(body.get("securityCalledAmount").toString()));
                    if (body.containsKey("securityDescription")) existing.setSecurityDescription((String) body.get("securityDescription"));
                    return ResponseEntity.ok(eventService.saveEvent(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        return eventService.getStats();
    }
}
