package com.xuexibaodian.app.dto;

import java.util.Map;

public class GitBranchSnapshotDto {
  public Long repoId;
  public String branchName;
  public String openFile;
  public Map<String, String> files;
}
