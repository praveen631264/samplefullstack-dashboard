package com.data.pipeline.controller;

import com.data.pipeline.model.AgentTrainingSession;
import com.data.pipeline.service.AgentTrainingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/training")
@Tag(name = "Agent Training", description = "Endpoints for training AI agents")
public class AgentTrainingController {

    private static final Logger log = LoggerFactory.getLogger(AgentTrainingController.class);

    @Autowired
    private AgentTrainingService trainingService;

    @Value("${app.n8n.trainer-webhook-url:https://n8n.aix.devx.systems/webhook/trainer-micro}")
    private String n8nTrainerUrl;

    @Value("${app.n8n.compare-webhook-url:https://n8n.aix.devx.systems/webhook/compare-micro}")
    private String n8nCompareUrl;

    @Value("${app.n8n.api-token:}")
    private String n8nApiToken;

    @Value("${app.n8n.oauth2-cookie:}")
    private String n8nOAuth2Cookie;

    @Value("${app.callback-base-url:http://localhost:5000}")
    private String callbackBaseUrl;

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<AgentTrainingSession> getSession(@PathVariable String sessionId) {
        return ResponseEntity.ok(trainingService.getOrCreateSession(sessionId));
    }

    @PostMapping("/check")
    public ResponseEntity<Map<String, String>> initiateCheck(
            @RequestParam String sessionId,
            @RequestParam String type, // maker, checker, compare
            @RequestParam String prompt,
            @RequestParam(required = false) MultipartFile file) {

        AgentTrainingSession session = trainingService.getOrCreateSession(sessionId);

        // Update prompts in session cache
        if ("maker".equals(type))
            session.setMakerPrompt(prompt);
        else if ("checker".equals(type))
            session.setCheckerPrompt(prompt);
        else if ("compare".equals(type))
            session.setComparePrompt(prompt);

        session.setStatus(type.toUpperCase() + "_PROCESSING");

        String targetWebhookUrl = "compare".equals(type) ? n8nCompareUrl : n8nTrainerUrl;
        log.info("Training check initiated: sessionId={}, type={}, webhookUrl={}", sessionId, type, targetWebhookUrl);

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            if (n8nApiToken != null && !n8nApiToken.isEmpty()) {
                headers.set("Authorization", "Bearer " + n8nApiToken);
            }
            if (n8nOAuth2Cookie != null && !n8nOAuth2Cookie.isEmpty()) {
                headers.set("Cookie", n8nOAuth2Cookie);
            }

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("sessionId", sessionId);
            body.add("type", type);
            body.add("prompt", prompt);
            body.add("baseUrl", callbackBaseUrl);

            if ("compare".equals(type)) {
                body.add("makerResult", session.getMakerResult() != null ? session.getMakerResult() : "{}");
                body.add("checkerResult", session.getCheckerResult() != null ? session.getCheckerResult() : "{}");
            }

            if (file != null && !file.isEmpty()) {
                final String originalFilename = file.getOriginalFilename();
                body.add("file", new org.springframework.core.io.ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        return originalFilename;
                    }
                });
                log.info("File attached: {}", originalFilename);
            }

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            var response = restTemplate.postForEntity(targetWebhookUrl, requestEntity, String.class);
            log.info("n8n response: status={}, body={}", response.getStatusCode(), response.getBody());

            return ResponseEntity.ok(Map.of("message", "Training initiated", "status", session.getStatus()));
        } catch (Exception e) {
            log.error("Failed to call n8n trainer webhook: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to contact n8n: " + e.getMessage()));
        }
    }

    @PostMapping("/callback")
    public ResponseEntity<Map<String, String>> n8nCallback(@RequestBody Map<String, String> payload) {
        String sessionId = payload.get("sessionId");
        String type = payload.get("type");
        String result = payload.get("result");

        if (sessionId == null || type == null) {
            log.warn("Training callback missing required fields: sessionId={}, type={}", sessionId, type);
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Missing sessionId or type"));
        }

        log.info("Training callback received: sessionId={}, type={}", sessionId, type);

        if ("maker".equals(type))
            trainingService.updateMakerResult(sessionId, result);
        else if ("checker".equals(type))
            trainingService.updateCheckerResult(sessionId, result);
        else if ("compare".equals(type))
            trainingService.updateCompareResult(sessionId, result);

        return ResponseEntity
                .ok(Map.of("status", "success", "message", "Result updated", "sessionId", sessionId, "type", type));
    }
}
