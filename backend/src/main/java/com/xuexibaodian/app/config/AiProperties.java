package com.xuexibaodian.app.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

@ConfigurationProperties(prefix = "app.ai")
public class AiProperties {

  private String apiKey = "";
  private String baseUrl = "";
  private String model = "";
  private int timeoutSeconds = 60;

  public String getApiKey() {
    return apiKey;
  }

  public void setApiKey(String apiKey) {
    this.apiKey = apiKey == null ? "" : apiKey.trim();
  }

  public String getBaseUrl() {
    return baseUrl;
  }

  public void setBaseUrl(String baseUrl) {
    this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model == null ? "" : model.trim();
  }

  public int getTimeoutSeconds() {
    return timeoutSeconds;
  }

  public void setTimeoutSeconds(int timeoutSeconds) {
    this.timeoutSeconds = timeoutSeconds;
  }

  public boolean isConfigured() {
    return StringUtils.hasText(apiKey) && StringUtils.hasText(baseUrl) && StringUtils.hasText(model);
  }

  public List<String> missingEnvKeys() {
    List<String> missing = new ArrayList<>();
    if (!StringUtils.hasText(apiKey)) missing.add("AI_API_KEY");
    if (!StringUtils.hasText(baseUrl)) missing.add("AI_BASE_URL");
    if (!StringUtils.hasText(model)) missing.add("AI_MODEL");
    return missing;
  }
}
