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
@Table(name = "git_branch_snapshot")
public class GitBranchSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "repo_id", nullable = false)
  private Long repoId;

  @Column(name = "branch_name", nullable = false, length = 128)
  private String branchName;

  @Column(name = "files_json", nullable = false, length = 16777215)
  private String filesJson;

  @Column(name = "open_file", length = 512)
  private String openFile;

  @Column(name = "fetched_at", nullable = false)
  private LocalDateTime fetchedAt;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  void onCreate() {
    LocalDateTime now = LocalDateTime.now();
    createdAt = now;
    updatedAt = now;
    if (fetchedAt == null) fetchedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = LocalDateTime.now();
  }

  public Long getId() {
    return id;
  }

  public Long getRepoId() {
    return repoId;
  }

  public void setRepoId(Long repoId) {
    this.repoId = repoId;
  }

  public String getBranchName() {
    return branchName;
  }

  public void setBranchName(String branchName) {
    this.branchName = branchName;
  }

  public String getFilesJson() {
    return filesJson;
  }

  public void setFilesJson(String filesJson) {
    this.filesJson = filesJson;
  }

  public String getOpenFile() {
    return openFile;
  }

  public void setOpenFile(String openFile) {
    this.openFile = openFile;
  }

  public LocalDateTime getFetchedAt() {
    return fetchedAt;
  }

  public void setFetchedAt(LocalDateTime fetchedAt) {
    this.fetchedAt = fetchedAt;
  }
}
