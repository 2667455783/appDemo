package com.xuexibaodian.app.repo;

import com.xuexibaodian.app.entity.StudySnapshot;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudySnapshotRepository extends JpaRepository<StudySnapshot, Long> {
  Optional<StudySnapshot> findByUserIdAndDomainId(Long userId, String domainId);
}
