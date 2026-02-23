package com.data.pipeline.repository;

import com.data.pipeline.model.SampleEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SampleEventRepository extends JpaRepository<SampleEvent, Long> {
    Optional<SampleEvent> findByEventId(String eventId);

    @Query("SELECT COUNT(e) FROM SampleEvent e WHERE e.eventId LIKE :prefix%")
    long countByEventIdStartingWith(@Param("prefix") String prefix);
}
