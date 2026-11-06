package com.xuexibaodian.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ChatMessageDto {

  @NotBlank
  @Pattern(regexp = "user|assistant", message = "role 只能是 user 或 assistant")
  private String role;

  @NotBlank
  @Size(max = 4000, message = "单条消息最多 4000 字")
  private String content;

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }
}
