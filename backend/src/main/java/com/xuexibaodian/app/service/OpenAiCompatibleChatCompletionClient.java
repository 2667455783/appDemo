package com.xuexibaodian.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.config.AiProperties;
import com.xuexibaodian.app.dto.ChatMessageDto;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class OpenAiCompatibleChatCompletionClient implements ChatCompletionClient {

  static final String SYSTEM_PROMPT =
      "你是「学习宝典」App 内的拓展学习助手。用简洁、准确的中文回答学习相关问题。"
          + "不要声称能访问用户的其它账号、工具或私人会话。";

  private final AiProperties props;
  private final ObjectMapper mapper;
  private final RestClient restClient;

  public OpenAiCompatibleChatCompletionClient(
      AiProperties props, ObjectMapper mapper, RestClient aiRestClient) {
    this.props = props;
    this.mapper = mapper;
    this.restClient = aiRestClient;
  }

  @Override
  public String complete(List<ChatMessageDto> messages) {
    String url = trimSlash(props.getBaseUrl()) + "/chat/completions";
    ObjectNode payload = mapper.createObjectNode();
    payload.put("model", props.getModel());
    ArrayNode msgNode = payload.putArray("messages");
    ObjectNode system = msgNode.addObject();
    system.put("role", "system");
    system.put("content", SYSTEM_PROMPT);
    for (ChatMessageDto m : messages) {
      ObjectNode item = msgNode.addObject();
      item.put("role", m.getRole());
      item.put("content", m.getContent());
    }

    String body;
    try {
      body =
          restClient
              .post()
              .uri(url)
              .contentType(MediaType.APPLICATION_JSON)
              .header("Authorization", "Bearer " + props.getApiKey())
              .body(payload)
              .retrieve()
              .body(String.class);
    } catch (RestClientResponseException ex) {
      throw new ApiException(502, providerErrorMessage(ex.getResponseBodyAsString(), ex.getStatusCode().value()));
    } catch (RuntimeException ex) {
      throw new ApiException(502, "无法连接对话提供商，请稍后重试");
    }

    return extractReply(body);
  }

  static String extractReply(String body) {
    if (body == null || body.isBlank()) {
      throw new ApiException(502, "对话服务没有返回可用内容");
    }
    try {
      JsonNode root = new ObjectMapper().readTree(body);
      if (root.has("error") && !root.get("error").isNull()) {
        throw new ApiException(502, providerErrorMessage(body, 0));
      }
      String content = readContent(root.path("choices").path(0).path("message").path("content"));
      if (content == null || content.isBlank()) {
        throw new ApiException(502, "对话服务没有返回可用内容");
      }
      return content.trim();
    } catch (ApiException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new ApiException(502, "对话服务返回无法解析");
    }
  }

  static String readContent(JsonNode content) {
    if (content == null || content.isMissingNode() || content.isNull()) return "";
    if (content.isTextual()) return content.asText();
    if (content.isArray()) {
      StringBuilder sb = new StringBuilder();
      for (JsonNode part : content) {
        if (part.isTextual()) sb.append(part.asText());
        else if (part.hasNonNull("text")) sb.append(part.get("text").asText(""));
      }
      return sb.toString();
    }
    return "";
  }

  static String providerErrorMessage(String raw, int status) {
    String fallback =
        status >= 400 ? "对话提供商返回错误（HTTP " + status + "）" : "对话提供商返回错误";
    if (raw == null || raw.isBlank()) return fallback;
    try {
      JsonNode err = new ObjectMapper().readTree(raw).path("error");
      String msg = err.path("message").asText("");
      if (!msg.isBlank()) {
        return "对话失败：" + sanitize(msg);
      }
    } catch (Exception ignored) {
      /* keep fallback */
    }
    return fallback;
  }

  private static String sanitize(String msg) {
    return msg.replaceAll("(?i)sk-[A-Za-z0-9\\-_]+", "[redacted]").trim();
  }

  static String trimSlash(String base) {
    if (base == null) return "";
    String t = base.trim();
    while (t.endsWith("/")) t = t.substring(0, t.length() - 1);
    return t;
  }
}
