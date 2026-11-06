package com.xuexibaodian.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xuexibaodian.app.common.ApiException;

public final class OpenAiDeltaParser {

  public record Piece(String text, boolean finished, String error) {
    static Piece ofDelta(String text) {
      return new Piece(text == null ? "" : text, false, null);
    }

    static Piece ofDone() {
      return new Piece("", true, null);
    }

    static Piece ofError(String message) {
      return new Piece("", true, message);
    }
  }

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private OpenAiDeltaParser() {}

  public static Piece parseData(String data) {
    if (data == null) return Piece.ofDelta("");
    String trimmed = data.trim();
    if (trimmed.isEmpty()) return Piece.ofDelta("");
    if ("[DONE]".equals(trimmed)) return Piece.ofDone();
    JsonNode root;
    try {
      root = MAPPER.readTree(trimmed);
    } catch (Exception ex) {
      throw new ApiException(502, "对话服务返回无法解析");
    }
    if (root.has("error") && !root.get("error").isNull()) {
      return Piece.ofError(
          OpenAiCompatibleChatCompletionClient.providerErrorMessage(trimmed, 0));
    }
    JsonNode delta = root.path("choices").path(0).path("delta");
    if (delta.isMissingNode() || delta.isNull()) {
      JsonNode message = root.path("choices").path(0).path("message");
      if (!message.isMissingNode()) {
        return Piece.ofDelta(OpenAiCompatibleChatCompletionClient.readContent(message.path("content")));
      }
      return Piece.ofDelta("");
    }
    return Piece.ofDelta(OpenAiCompatibleChatCompletionClient.readContent(delta.path("content")));
  }
}
