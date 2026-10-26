package com.xuexibaodian.app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.xuexibaodian.app.dto.StudySnapshotDto;
import com.xuexibaodian.app.entity.StudySnapshot;
import com.xuexibaodian.app.repo.StudySnapshotRepository;
import java.util.Collections;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudyService {

  private final StudySnapshotRepository snapshots;
  private final JsonHelper json;

  public StudyService(StudySnapshotRepository snapshots, JsonHelper json) {
    this.snapshots = snapshots;
    this.json = json;
  }

  @Transactional(readOnly = true)
  public StudySnapshotDto get(Long userId, String domainId) {
    return snapshots
        .findByUserIdAndDomainId(userId, domainId)
        .map(this::toDto)
        .orElseGet(this::empty);
  }

  @Transactional
  public StudySnapshotDto put(Long userId, String domainId, StudySnapshotDto body) {
    StudySnapshot snap =
        snapshots
            .findByUserIdAndDomainId(userId, domainId)
            .orElseGet(
                () -> {
                  StudySnapshot s = new StudySnapshot();
                  s.setUserId(userId);
                  s.setDomainId(domainId);
                  return s;
                });
    snap.setPayload(json.write(body == null ? empty() : body));
    return toDto(snapshots.save(snap));
  }

  private StudySnapshotDto toDto(StudySnapshot snap) {
    StudySnapshotDto dto =
        json.read(snap.getPayload(), new TypeReference<StudySnapshotDto>() {});
    return dto == null ? empty() : dto;
  }

  private StudySnapshotDto empty() {
    StudySnapshotDto d = new StudySnapshotDto();
    d.vocab = Collections.emptyMap();
    d.errors = Collections.emptyList();
    d.reports = Collections.emptyList();
    d.gapPlan = Collections.emptyList();
    d.gapGeneratedAt = "";
    d.doneTaskIds = Collections.emptyList();
    d.doneTaskDate = "";
    d.radarBoost = Map.of();
    return d;
  }
}
