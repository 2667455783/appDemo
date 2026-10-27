package com.xuexibaodian.app.dto;

import java.util.Map;

public class UserProjectUpsertRequest {
  public Long id;
  public String title;
  public String sourceType;
  public String openFile;
  public Map<String, String> files;
}
