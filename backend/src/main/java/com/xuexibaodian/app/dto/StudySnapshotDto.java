package com.xuexibaodian.app.dto;

import java.util.Map;

/** 与前端 study store snapshot 对齐的宽松结构 */
public class StudySnapshotDto {
  public Map<String, Object> vocab;
  public Object errors;
  public Object reports;
  public Object gapPlan;
  public String gapGeneratedAt;
  public Object doneTaskIds;
  public String doneTaskDate;
  public Map<String, Object> radarBoost;
}
