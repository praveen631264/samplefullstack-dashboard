package com.data.pipeline.repository;

import com.data.pipeline.model.SampleEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SampleEventRepository extends JpaRepository<SampleEvent, Long> {
    Optional<SampleEvent> findByEventId(String eventId);
}
