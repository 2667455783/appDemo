package com.xuexibaodian.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "git_repo")
public class GitRepo {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(nullable = false, length = 16)
  private String provider;

  @Column(nullable = false, length = 128)
  private String owner;

  @Column(nullable = false, length = 128)
  private String repo;

  @Column(nullable = false, length = 255)
  private String subpath = "";

  @Column(name = "source_url", nullable = false, length = 512)
  private String sourceUrl = "";

  @Column(nullable = false, length = 255)
  private String title = "";

  @Column(name = "default_branch", nullable = false, length = 128)
  private String defaultBranch = "main";

  @Column(name = "current_branch", nullable = false, length = 128)
  private String currentBranch = "main";

  @Column(name = "asset_base", length = 512)
  private String assetBase;

  @Column(name = "detected_root", length = 255)
  private String detectedRoot;

  @Column(name = "open_file", length = 512)
  private String openFile;

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

  public String getProvider() {
    return provider;
  }

  public void setProvider(String provider) {
    this.provider = provider;
  }

  public String getOwner() {
    return owner;
  }

  public void setOwner(String owner) {
    this.owner = owner;
  }

  public String getRepo() {
    return repo;
  }

  public void setRepo(String repo) {
    this.repo = repo;
  }

  public String getSubpath() {
    return subpath;
  }

  public void setSubpath(String subpath) {
    this.subpath = subpath == null ? "" : subpath;
  }

  public String getSourceUrl() {
    return sourceUrl;
  }

  public void setSourceUrl(String sourceUrl) {
    this.sourceUrl = sourceUrl == null ? "" : sourceUrl;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title == null ? "" : title;
  }

  public String getDefaultBranch() {
    return defaultBranch;
  }

  public void setDefaultBranch(String defaultBranch) {
    this.defaultBranch = defaultBranch == null ? "main" : defaultBranch;
  }

  public String getCurrentBranch() {
    return currentBranch;
  }

  public void setCurrentBranch(String currentBranch) {
    this.currentBranch = currentBranch == null ? "main" : currentBranch;
  }

  public String getAssetBase() {
    return assetBase;
  }

  public void setAssetBase(String assetBase) {
    this.assetBase = assetBase;
  }

  public String getDetectedRoot() {
    return detectedRoot;
  }

  public void setDetectedRoot(String detectedRoot) {
    this.detectedRoot = detectedRoot;
  }

  public String getOpenFile() {
    return openFile;
  }

  public void setOpenFile(String openFile) {
    this.openFile = openFile;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }
}
