package com.xuexibaodian.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.xuexibaodian.app.common.ApiException;
import org.junit.jupiter.api.Test;

class OpenAiCompatibleChatCompletionClientTest {

  @Test
  void extractReplyFromStandardChoices() {
    String body =
        "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"第一行\\n第二行\"}}]}";
    assertEquals("第一行\n第二行", OpenAiCompatibleChatCompletionClient.extractReply(body));
  }

  @Test
  void extractReplyFromContentParts() {
    String body =
        "{\"choices\":[{\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"你好\"},{\"text\":\"世界\"}]}}]}";
    assertEquals("你好世界", OpenAiCompatibleChatCompletionClient.extractReply(body));
  }

  @Test
  void emptyChoicesAreNotFabricated() {
    ApiException ex =
        assertThrows(
            ApiException.class,
            () -> OpenAiCompatibleChatCompletionClient.extractReply("{\"choices\":[]}"));
    assertEquals(502, ex.getCode());
    assertTrue(ex.getMessage().contains("没有返回可用内容"));
  }

  @Test
  void providerErrorDoesNotLeakKey() {
    String raw = "{\"error\":{\"message\":\"Invalid API key sk-ABCDEFG123\"}}";
    String msg = OpenAiCompatibleChatCompletionClient.providerErrorMessage(raw, 401);
    assertTrue(msg.contains("对话失败"));
    assertTrue(msg.contains("[redacted]"));
    assertTrue(!msg.contains("sk-ABCDEFG123"));
  }

  @Test
  void trimSlashRemovesTrailingSlashes() {
    assertEquals("https://api.openai.com/v1", OpenAiCompatibleChatCompletionClient.trimSlash("https://api.openai.com/v1/"));
  }
}
