package com.xuexibaodian.app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.xuexibaodian.app.dto.ProfileDto;
import com.xuexibaodian.app.entity.UserProfile;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ProfileMapper {

  private final JsonHelper json;

  public ProfileMapper(JsonHelper json) {
    this.json = json;
  }

  public ProfileDto toDto(UserProfile p) {
    ProfileDto d = new ProfileDto();
    d.onboarded = Boolean.TRUE.equals(p.getOnboarded());
    d.name = p.getName();
    d.birthday = p.getBirthday() == null ? "" : p.getBirthday().toString();
    d.motto = p.getMotto() == null ? "" : p.getMotto();
    d.level = p.getLevel();
    d.targetScore = p.getTargetScore();
    d.examDate = p.getExamDate() == null ? null : p.getExamDate().toString();
    d.streak = p.getStreak();
    d.lastStudyDate = p.getLastStudyDate() == null ? "" : p.getLastStudyDate().toString();
    d.activeDomainId = p.getActiveDomain();
    d.domainLevels = json.read(p.getDomainLevels(), new TypeReference<Map<String, String>>() {});
    d.officialScore = json.readTree(p.getOfficialScore());
    d.examMemory = json.readTree(p.getExamMemory());
    return d;
  }

  public void apply(UserProfile p, ProfileDto d) {
    if (d == null) return;
    if (d.onboarded != null) p.setOnboarded(d.onboarded);
    if (d.name != null) p.setName(d.name.isBlank() ? "\u5b66\u4e60\u8005" : d.name.trim());
    if (d.birthday != null) p.setBirthday(parseDate(d.birthday));
    if (d.motto != null) p.setMotto(d.motto);
    if (d.level != null) p.setLevel(d.level);
    if (d.targetScore != null) p.setTargetScore(d.targetScore);
    if (d.examDate != null) p.setExamDate(parseDate(d.examDate));
    if (d.streak != null) p.setStreak(d.streak);
    if (d.lastStudyDate != null) p.setLastStudyDate(parseDate(d.lastStudyDate));
    if (d.activeDomainId != null) p.setActiveDomain(d.activeDomainId);
    if (d.domainLevels != null) p.setDomainLevels(json.write(d.domainLevels));
    if (d.officialScore != null) p.setOfficialScore(json.write(d.officialScore));
    if (d.examMemory != null) p.setExamMemory(json.write(d.examMemory));
  }

  private static LocalDate parseDate(String raw) {
    if (raw == null || raw.isBlank()) return null;
    return LocalDate.parse(raw);
  }
}
