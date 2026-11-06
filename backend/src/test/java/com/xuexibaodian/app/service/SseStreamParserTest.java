package com.xuexibaodian.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class SseStreamParserTest {

  @Test
  void utf8CharacterSplitAcrossNetworkChunksReassembles() {
    String event = "data: {\"choices\":[{\"delta\":{\"content\":\"你好世界\"}}]}\n\n";
    byte[] bytes = event.getBytes(StandardCharsets.UTF_8);
    SseStreamParser parser = new SseStreamParser();
    List<SseStreamParser.Event> got = new ArrayList<>();
    for (byte b : bytes) {
      got.addAll(parser.push(new byte[] {b}, 0, 1));
    }
    got.addAll(parser.finish());
    assertEquals(1, got.size());
    assertTrue(got.get(0).data().contains("你好世界"));
  }

  @Test
  void incompleteSseLineStaysBufferedUntilNewline() {
    SseStreamParser parser = new SseStreamParser();
    byte[] firstBytes = "data: {\"choices\":[{\"delta\":{\"content\":\"现".getBytes(StandardCharsets.UTF_8);
    List<SseStreamParser.Event> first = parser.push(firstBytes, 0, firstBytes.length);
    assertTrue(first.isEmpty());
    byte[] rest = "在\"}}]}\n\n".getBytes(StandardCharsets.UTF_8);
    List<SseStreamParser.Event> second = parser.push(rest, 0, rest.length);
    assertEquals(1, second.size());
    assertTrue(second.get(0).data().contains("现在"));
  }

  @Test
  void blankAndCommentLinesDoNotEmit() {
    SseStreamParser parser = new SseStreamParser();
    String raw = ": keep-alive\n\ndata: [DONE]\n\n";
    List<SseStreamParser.Event> got =
        parser.push(raw.getBytes(StandardCharsets.UTF_8), 0, raw.getBytes(StandardCharsets.UTF_8).length);
    got.addAll(parser.finish());
    assertEquals(1, got.size());
    assertEquals("[DONE]", got.get(0).data());
  }
}
