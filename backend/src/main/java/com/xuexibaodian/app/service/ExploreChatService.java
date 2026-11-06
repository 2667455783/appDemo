package com.xuexibaodian.app.service;

import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.config.AiProperties;
import com.xuexibaodian.app.dto.ChatMessageDto;
import com.xuexibaodian.app.dto.ChatReplyDto;
import com.xuexibaodian.app.dto.ChatRequest;
import com.xuexibaodian.app.dto.ChatStatusDto;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ExploreChatService {

  private final AiProperties props;
  private final ChatCompletionClient client;

  public ExploreChatService(AiProperties props, ChatCompletionClient client) {
    this.props = props;
    this.client = client;
  }

  public ChatStatusDto status() {
    ChatStatusDto dto = new ChatStatusDto();
    dto.hasApiKey = StringUtils.hasText(props.getApiKey());
    dto.hasBaseUrl = StringUtils.hasText(props.getBaseUrl());
    dto.hasModel = StringUtils.hasText(props.getModel());
    dto.missing = props.missingEnvKeys();
    dto.configured = props.isConfigured();
    return dto;
  }

  public ChatReplyDto chat(ChatRequest request) {
    if (!props.isConfigured()) {
      List<String> missing = props.missingEnvKeys();
      throw new ApiException(
          503,
          "对话服务尚未配置（缺少 "
              + String.join("、", missing)
              + "）。请写入 backend/.env.dev 或线上环境变量后重启后端。");
    }
    List<ChatMessageDto> cleaned = sanitize(request.getMessages());
    if (cleaned.isEmpty()) {
      throw new ApiException(400, "请输入要发送的内容");
    }
    if (!"user".equals(cleaned.get(cleaned.size() - 1).getRole())) {
      throw new ApiException(400, "最后一条必须是用户消息");
    }
    String reply = client.complete(cleaned);
    if (!StringUtils.hasText(reply)) {
      throw new ApiException(502, "对话服务没有返回可用内容");
    }
    return new ChatReplyDto(reply.trim());
  }

  static List<ChatMessageDto> sanitize(List<ChatMessageDto> incoming) {
    List<ChatMessageDto> out = new ArrayList<>();
    if (incoming == null) return out;
    for (ChatMessageDto m : incoming) {
      if (m == null || !StringUtils.hasText(m.getRole()) || !StringUtils.hasText(m.getContent())) {
        continue;
      }
      String role = m.getRole().trim();
      if (!"user".equals(role) && !"assistant".equals(role)) continue;
      ChatMessageDto copy = new ChatMessageDto();
      copy.setRole(role);
      copy.setContent(m.getContent().trim());
      out.add(copy);
    }
    if (out.size() > 20) {
      return new ArrayList<>(out.subList(out.size() - 20, out.size()));
    }
    return out;
  }
}
