package com.xuexibaodian.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_profile")
public class UserProfile {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false, unique = true)
  private Long userId;

  @Column(nullable = false)
  private Boolean onboarded = false;

  @Column(nullable = false, length = 64)
  private String name = "\u5b66\u4e60\u8005";

  private LocalDate birthday;

  @Column(nullable = false, length = 255)
  private String motto = "";

  @Column(nullable = false, length = 32)
  private String level = "cet4";

  @Column(name = "target_score", nullable = false)
  private Integer targetScore = 425;

  @Column(name = "exam_date")
  private LocalDate examDate;

  @Column(nullable = false)
  private Integer streak = 0;

  @Column(name = "last_study_date")
  private LocalDate lastStudyDate;

  @Column(name = "active_domain", nullable = false, length = 32)
  private String activeDomain = "english";

  @Column(name = "domain_levels", length = 4096)
  private String domainLevels;

  @Column(name = "official_score", length = 8192)
  private String officialScore;

  @Column(name = "exam_memory", length = 8192)
  private String examMemory;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  void onCreate() {
    LocalDateTime now = LocalDateTime.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = LocalDateTime.now();
  }

  public Long getId() {
    return id;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  public Boolean getOnboarded() {
    return onboarded;
  }

  public void setOnboarded(Boolean onboarded) {
    this.onboarded = onboarded;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public LocalDate getBirthday() {
    return birthday;
  }

  public void setBirthday(LocalDate birthday) {
    this.birthday = birthday;
  }

  public String getMotto() {
    return motto;
  }

  public void setMotto(String motto) {
    this.motto = motto;
  }

  public String getLevel() {
    return level;
  }

  public void setLevel(String level) {
    this.level = level;
  }

  public Integer getTargetScore() {
    return targetScore;
  }

  public void setTargetScore(Integer targetScore) {
    this.targetScore = targetScore;
  }

  public LocalDate getExamDate() {
    return examDate;
  }

  public void setExamDate(LocalDate examDate) {
    this.examDate = examDate;
  }

  public Integer getStreak() {
    return streak;
  }

  public void setStreak(Integer streak) {
    this.streak = streak;
  }

  public LocalDate getLastStudyDate() {
    return lastStudyDate;
  }

  public void setLastStudyDate(LocalDate lastStudyDate) {
    this.lastStudyDate = lastStudyDate;
  }

  public String getActiveDomain() {
    return activeDomain;
  }

  public void setActiveDomain(String activeDomain) {
    this.activeDomain = activeDomain;
  }

  public String getDomainLevels() {
    return domainLevels;
  }

  public void setDomainLevels(String domainLevels) {
    this.domainLevels = domainLevels;
  }

  public String getOfficialScore() {
    return officialScore;
  }

  public void setOfficialScore(String officialScore) {
    this.officialScore = officialScore;
  }

  public String getExamMemory() {
    return examMemory;
  }

  public void setExamMemory(String examMemory) {
    this.examMemory = examMemory;
  }
}
