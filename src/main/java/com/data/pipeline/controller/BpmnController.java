package com.data.pipeline.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/bpmn")
@Tag(name = "BPMN", description = "BPMN Process Definitions")
public class BpmnController {

    @GetMapping(value = "/ca-event-processing", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getBpmnDefinition() throws IOException {
        ClassPathResource resource = new ClassPathResource("ca-event-processing.bpmn");
        String xml = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        return ResponseEntity.ok(xml);
    }
}
