package com.xuexibaodian.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class OpenAiDeltaParserTest {

  @Test
  void roleOnlyChunkHasNoText() {
    OpenAiDeltaParser.Piece piece =
        OpenAiDeltaParser.parseData("{\"choices\":[{\"delta\":{\"role\":\"assistant\"}}]}");
    assertEquals("", piece.text());
    assertFalse(piece.finished());
  }

  @Test
  void emptyContentChunkHasNoText() {
    OpenAiDeltaParser.Piece piece =
        OpenAiDeltaParser.parseData("{\"choices\":[{\"delta\":{\"content\":\"\"}}]}");
    assertEquals("", piece.text());
  }

  @Test
  void contentDeltaIsReturned() {
    OpenAiDeltaParser.Piece piece =
        OpenAiDeltaParser.parseData("{\"choices\":[{\"delta\":{\"content\":\"现\"}}]}");
    assertEquals("现", piece.text());
  }

  @Test
  void doneToken() {
    OpenAiDeltaParser.Piece piece = OpenAiDeltaParser.parseData("[DONE]");
    assertTrue(piece.finished());
  }
}
