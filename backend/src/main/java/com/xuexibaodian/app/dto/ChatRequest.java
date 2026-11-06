package com.xuexibaodian.app.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;

public class ChatRequest {

  @NotEmpty(message = "请至少发送一条消息")
  @Size(max = 20, message = "一次最多携带 20 条上下文")
  @Valid
  private List<ChatMessageDto> messages = new ArrayList<>();

  public List<ChatMessageDto> getMessages() {
    return messages;
  }

  public void setMessages(List<ChatMessageDto> messages) {
    this.messages = messages;
  }
}
