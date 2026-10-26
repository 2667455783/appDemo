package com.xuexibaodian.app.dto;

import java.util.Map;

public class GitRepoUpsertRequest {
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
  /** 当前分支文件 path→content */
  public Map<String, String> files;
}
