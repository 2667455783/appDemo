package com.xuexibaodian.app.service;

import com.xuexibaodian.app.dto.ChatMessageDto;
import java.util.List;

public interface ChatCompletionClient {

  String complete(List<ChatMessageDto> messages);
}
