package com.xuexibaodian.app.dto;

import java.util.Map;

public class UserProjectDetailDto {
  public Long id;
  public String title;
  public String sourceType;
  public String openFile;
  public int fileCount;
  public Map<String, String> files;
  public String updatedAt;
}
