package com.xuexibaodian.app.dto;

import java.util.ArrayList;
import java.util.List;

public class ChatStatusDto {

  public boolean configured;
  public boolean hasApiKey;
  public boolean hasBaseUrl;
  public boolean hasModel;
  public List<String> missing = new ArrayList<>();
}
