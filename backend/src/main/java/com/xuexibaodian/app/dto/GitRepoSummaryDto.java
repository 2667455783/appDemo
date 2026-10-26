package com.xuexibaodian.app.dto;

import java.util.List;

public class GitRepoSummaryDto {
  public Long id;
  public String provider;
  public String owner;
  public String repo;
  public String subpath;
  public String sourceUrl;
  public String title;
  public String defaultBranch;
  public String currentBranch;
  public String assetBase;
  public String detectedRoot;
  public String openFile;
  public List<String> cachedBranches;
}
