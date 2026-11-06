package com.xuexibaodian.app.service;

import com.xuexibaodian.app.dto.ChatMessageDto;
import java.io.IOException;
import java.util.List;

public interface ChatCompletionClient {

  String complete(List<ChatMessageDto> messages);

  default void stream(List<ChatMessageDto> messages, ChatStreamSink sink) throws IOException {
    String reply = complete(messages);
    if (reply != null && !reply.isBlank()) sink.onDelta(reply);
    sink.onComplete();
  }
}
