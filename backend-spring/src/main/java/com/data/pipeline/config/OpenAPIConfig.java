package com.data.pipeline.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenAPIConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Test orchestrator API")
                        .version("2.0.0")
                        .description("Generic data processing orchestrator flow")
                        .contact(new Contact()
                                .name("Alpha Team")
                                .email("alpha-team@example.com")));
    }
}
