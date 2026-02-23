package com.data.pipeline.config;

import com.data.pipeline.model.SampleEvent;
import com.data.pipeline.repository.SampleEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.Arrays;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private SampleEventRepository repository;

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() == 0) {
            SampleEvent e1 = new SampleEvent();
            e1.setEventId("EVT0001");
            e1.setCusip("CU0000001");
            e1.setEventType("Sample Data Point");
            e1.setPrincipalRate(new BigDecimal("100.00"));
            e1.setPremiumRate(new BigDecimal("102.00"));
            e1.setStatus("Verified");
            e1.setRemarks("Initial sample data");

            SampleEvent e2 = new SampleEvent();
            e2.setEventId("EVT0002");
            e2.setCusip("CU0000002");
            e2.setEventType("Test Record");
            e2.setPrincipalRate(new BigDecimal("50.00"));
            e2.setStatus("Created");
            e2.setRemarks("Pending verification in test flow");

            repository.saveAll(Arrays.asList(e1, e2));
        }
    }
}
