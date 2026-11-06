package com.xuexibaodian.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.config.AiProperties;
import com.xuexibaodian.app.dto.ChatMessageDto;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class OpenAiCompatibleChatCompletionClient implements ChatCompletionClient {

  static final String SYSTEM_PROMPT =
      "你是「学习宝典」App 内的拓展学习助手。用简洁、准确的中文回答学习相关问题。"
          + "不要声称能访问用户的其它账号、工具或私人会话。";

  private final AiProperties props;
  private final ObjectMapper mapper;
  private final HttpClient httpClient;

  public OpenAiCompatibleChatCompletionClient(
      AiProperties props, ObjectMapper mapper, HttpClient aiHttpClient) {
    this.props = props;
    this.mapper = mapper;
    this.httpClient = aiHttpClient;
  }

  @Override
  public String complete(List<ChatMessageDto> messages) {
    StringBuilder sb = new StringBuilder();
    try {
      stream(
          messages,
          new ChatStreamSink() {
            @Override
            public void onDelta(String text) {
              if (text != null) sb.append(text);
            }
          });
    } catch (IOException ex) {
      throw new ApiException(502, "无法连接对话提供商，请稍后重试");
    }
    String reply = sb.toString().trim();
    if (reply.isEmpty()) throw new ApiException(502, "对话服务没有返回可用内容");
    return reply;
  }

  @Override
  public void stream(List<ChatMessageDto> messages, ChatStreamSink sink) throws IOException {
    String url = trimSlash(props.getBaseUrl()) + "/chat/completions";
    ObjectNode payload = mapper.createObjectNode();
    payload.put("model", props.getModel());
    payload.put("stream", true);
    ArrayNode msgNode = payload.putArray("messages");
    ObjectNode system = msgNode.addObject();
    system.put("role", "system");
    system.put("content", SYSTEM_PROMPT);
    for (ChatMessageDto m : messages) {
      ObjectNode item = msgNode.addObject();
      item.put("role", m.getRole());
      item.put("content", m.getContent());
    }

    HttpRequest request =
        HttpRequest.newBuilder(URI.create(url))
            .timeout(Duration.ofSeconds(Math.max(5, props.getTimeoutSeconds())))
            .header("Authorization", "Bearer " + props.getApiKey())
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream")
            .POST(HttpRequest.BodyPublishers.ofString(payload.toString(), StandardCharsets.UTF_8))
            .build();

    HttpResponse<InputStream> response;
    try {
      response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new ApiException(502, "对话已取消");
    } catch (IOException ex) {
      throw new ApiException(502, "无法连接对话提供商，请稍后重试");
    }

    int status = response.statusCode();
    try (InputStream in = response.body()) {
      if (status < 200 || status >= 300) {
        String raw = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        throw new ApiException(502, providerErrorMessage(raw, status));
      }
      readSse(in, sink);
    }
    if (!sink.isCancelled()) sink.onComplete();
  }

  static void readSse(InputStream in, ChatStreamSink sink) throws IOException {
    SseStreamParser parser = new SseStreamParser();
    byte[] buf = new byte[256];
    int n;
    while (!sink.isCancelled() && (n = in.read(buf)) != -1) {
      if (dispatch(parser.push(buf, 0, n), sink)) return;
    }
    if (!sink.isCancelled()) dispatch(parser.finish(), sink);
  }

  private static boolean dispatch(List<SseStreamParser.Event> events, ChatStreamSink sink)
      throws IOException {
    for (SseStreamParser.Event ev : events) {
      if (sink.isCancelled()) return true;
      OpenAiDeltaParser.Piece piece = OpenAiDeltaParser.parseData(ev.data());
      if (piece.error() != null) throw new ApiException(502, piece.error());
      if (piece.finished()) return true;
      if (piece.text() != null && !piece.text().isEmpty()) sink.onDelta(piece.text());
    }
    return false;
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
