package com.xuexibaodian.app.dto;

import java.util.Map;

public class GitBranchPutRequest {
  public Map<String, String> files;
  public String openFile;
  /** 写入后是否把仓的 current_branch 切到本分支，默认 true */
  public Boolean makeCurrent;
}
