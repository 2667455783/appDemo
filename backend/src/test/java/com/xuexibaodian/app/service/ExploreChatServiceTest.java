package com.xuexibaodian.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.config.AiProperties;
import com.xuexibaodian.app.dto.ChatMessageDto;
import com.xuexibaodian.app.dto.ChatReplyDto;
import com.xuexibaodian.app.dto.ChatRequest;
import com.xuexibaodian.app.dto.ChatStatusDto;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class ExploreChatServiceTest {

  @Test
  void statusReportsMissingKeysWhenUnconfigured() {
    ExploreChatService service = new ExploreChatService(new AiProperties(), (messages) -> "nope");
    ChatStatusDto status = service.status();
    assertFalse(status.configured);
    assertFalse(status.hasApiKey);
    assertFalse(status.hasBaseUrl);
    assertFalse(status.hasModel);
    assertTrue(status.missing.contains("AI_API_KEY"));
    assertTrue(status.missing.contains("AI_BASE_URL"));
    assertTrue(status.missing.contains("AI_MODEL"));
  }

  @Test
  void chatWithoutConfigDoesNotCallProvider() {
    boolean[] called = {false};
    ExploreChatService service =
        new ExploreChatService(
            new AiProperties(),
            (messages) -> {
              called[0] = true;
              return "should not happen";
            });
    ApiException ex = assertThrows(ApiException.class, () -> service.chat(userRequest("你好")));
    assertEquals(503, ex.getCode());
    assertTrue(ex.getMessage().contains("AI_API_KEY"));
    assertFalse(called[0]);
  }

  @Test
  void firstMessageAndFollowUpGoToProviderWithHistory() {
    List<List<ChatMessageDto>> captured = new ArrayList<>();
    ExploreChatService service =
        new ExploreChatService(
            configured(),
            (messages) -> {
              captured.add(messages);
              return "助手：" + messages.get(messages.size() - 1).getContent();
            });

    ChatReplyDto first = service.chat(userRequest("什么是现在完成时？"));
    assertEquals("助手：什么是现在完成时？", first.reply);

    ChatRequest follow = new ChatRequest();
    follow.setMessages(
        List.of(
            msg("user", "什么是现在完成时？"),
            msg("assistant", first.reply),
            msg("user", "再举一个例子")));
    ChatReplyDto second = service.chat(follow);
    assertEquals("助手：再举一个例子", second.reply);
    assertEquals(2, captured.size());
    assertEquals(1, captured.get(0).size());
    assertEquals(3, captured.get(1).size());
    assertEquals("user", captured.get(1).get(2).getRole());
  }

  @Test
  void emptyProviderReplyIsAnError() {
    ExploreChatService service = new ExploreChatService(configured(), (messages) -> "   ");
    ApiException ex = assertThrows(ApiException.class, () -> service.chat(userRequest("hi")));
    assertEquals(502, ex.getCode());
  }

  @Test
  void lastMessageMustBeUser() {
    ExploreChatService service = new ExploreChatService(configured(), (messages) -> "ok");
    ChatRequest req = new ChatRequest();
    req.setMessages(List.of(msg("assistant", "我先说")));
    ApiException ex = assertThrows(ApiException.class, () -> service.chat(req));
    assertEquals(400, ex.getCode());
  }

  @Test
  void streamForwardsIncrementalChunksBeforeComplete() throws Exception {
    List<Long> at = new ArrayList<>();
    List<String> texts = new ArrayList<>();
    ExploreChatService service =
        new ExploreChatService(
            configured(),
            new ChatCompletionClient() {
              @Override
              public String complete(List<ChatMessageDto> messages) {
                return "unused";
              }

              @Override
              public void stream(List<ChatMessageDto> messages, ChatStreamSink sink) throws IOException {
                try {
                  sink.onDelta("现");
                  Thread.sleep(50);
                  sink.onDelta("在");
                  sink.onComplete();
                } catch (InterruptedException e) {
                  Thread.currentThread().interrupt();
                  throw new IOException(e);
                }
              }
            });
    service.stream(
        userRequest("hi"),
        new ChatStreamSink() {
          @Override
          public void onDelta(String text) {
            texts.add(text);
            at.add(System.currentTimeMillis());
          }
        });
    assertEquals(List.of("现", "在"), texts);
    assertTrue(at.get(1) - at.get(0) >= 30);
  }

  private static AiProperties configured() {
    AiProperties p = new AiProperties();
    p.setApiKey("test-key");
    p.setBaseUrl("https://example.invalid/v1");
    p.setModel("test-model");
    return p;
  }

  private static ChatRequest userRequest(String text) {
    ChatRequest req = new ChatRequest();
    req.setMessages(List.of(msg("user", text)));
    return req;
  }

  private static ChatMessageDto msg(String role, String content) {
    ChatMessageDto m = new ChatMessageDto();
    m.setRole(role);
    m.setContent(content);
    return m;
  }
}
