package com.xuexibaodian.app.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class JsonHelper {

  private final ObjectMapper mapper;

  public JsonHelper(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  public String write(Object value) {
    if (value == null) return null;
    try {
      return mapper.writeValueAsString(value);
    } catch (JsonProcessingException e) {
      throw new IllegalArgumentException("JSON 序列化失败", e);
    }
  }

  public <T> T read(String json, TypeReference<T> type) {
    if (json == null || json.isBlank()) return null;
    try {
      return mapper.readValue(json, type);
    } catch (JsonProcessingException e) {
      return null;
    }
  }

  public Object readTree(String json) {
    if (json == null || json.isBlank()) return null;
    try {
      return mapper.readTree(json);
    } catch (JsonProcessingException e) {
      return null;
    }
  }
}
