# Test Orchestrator v2.0

## Overview
A generic data processing orchestrator platform built with Spring Boot (Java) backend and vanilla HTML/CSS/JS frontend. Features workflow management, event processing with maker-checker patterns, BPMN process visualization, agent training, and n8n webhook integration.

## Architecture
- **Frontend**: Vanilla HTML + CSS + JavaScript (served as static files)
- **Backend**: Spring Boot 3.2.0 (Java 17+) REST API
- **Database**: H2 (default/dev), PostgreSQL (production)
- **ORM**: Spring Data JPA / Hibernate
- **API Docs**: SpringDoc OpenAPI / Swagger UI
- **Workflow Engine**: n8n webhook integration

## Project Structure
```
frontend/
  index.html           - Main SPA with 4 views (Create Event, Events, Train Agents, BPMN)
  app.js               - Frontend application logic
  styles.css           - Professional fintech-style white theme
  upload-test.html     - File upload test page

src/main/java/com/data/pipeline/
  DataPipelineApplication.java      - Spring Boot entry point
  config/
    DataInitializer.java            - Sample data seeder
    OpenAPIConfig.java              - Swagger/OpenAPI config
    WebConfig.java                  - CORS and web config
  controller/
    AgentConfigController.java      - Agent training CRUD endpoints
    AuditController.java            - Audit trail endpoints
    BpmnController.java             - BPMN XML serving endpoint
    SampleEventController.java      - Event CRUD endpoints
    WorkflowController.java         - Workflow management endpoints
  model/
    AgentConfig.java                - Agent configuration entity
    AuditTrail.java                 - Audit entity
    SampleEvent.java                - Event entity
    WorkflowExecution.java          - Workflow execution entity
  repository/
    AgentConfigRepository.java      - Agent JPA repository
    AuditTrailRepository.java       - Audit JPA repository
    SampleEventRepository.java      - Event JPA repository
    WorkflowExecutionRepository.java - Workflow JPA repository
  service/
    AgentConfigService.java         - Agent configuration logic
    SampleEventService.java         - Event business logic
    WorkflowService.java            - Workflow orchestration + n8n integration

src/main/resources/
  application.properties            - App configuration
  ca-event-processing.bpmn          - BPMN process definition
```

## ID Formats
- **Workflow ID**: EVT-DDMMYYYY-001 (sequential, resets daily)
- **CA ID (Event ID)**: CA-DDMMYY-001 (sequential, resets daily)

## API Endpoints
- `GET /api/workflows` - List all workflow executions
- `POST /api/workflows` - Create new workflow (multipart file upload)
- `GET /api/workflows/{id}` - Get workflow by ID
- `PUT /api/workflows/{id}/callback` - Workflow callback from n8n
- `GET /api/events` - List all events
- `GET /api/events/{id}` - Get event by ID
- `PUT /api/events/{id}` - Update event
- `GET /api/agents` - List all agent configs
- `POST /api/agents` - Create new agent config
- `PUT /api/agents/{id}` - Update agent config
- `DELETE /api/agents/{id}` - Delete agent config
- `GET /api/audit` - Get audit trail
- `GET /swagger-ui.html` - Swagger UI
- `GET /h2-console` - H2 database console

## Database
- Default: H2 file-based database (no setup required)
- Production: PostgreSQL (configure via environment variables)
- Tables: workflow_executions, sample_events, audit_trail, agent_configs

## Running
```bash
mvn clean package -DskipTests   # Build the JAR
java -jar target/test-orchestrator-2.0.0.jar  # Run on port 5000
```

## Environment Variables (optional, for PostgreSQL)
- `SPRING_DATASOURCE_URL` - JDBC URL
- `SPRING_DATASOURCE_DRIVER` - Driver class
- `SPRING_DATASOURCE_USERNAME` - DB username
- `SPRING_DATASOURCE_PASSWORD` - DB password
- `SPRING_JPA_DIALECT` - Hibernate dialect
