package com.xuexibaodian.app.service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** 按字节增量解析 SSE：处理 UTF-8 切包和半行。 */
public final class SseStreamParser {

  public record Event(String name, String data) {}

  private final byte[] leftover = new byte[4];
  private int leftoverLen;
  private final StringBuilder line = new StringBuilder();
  private String eventName = "message";
  private final StringBuilder data = new StringBuilder();
  private boolean dataSeen;

  public List<Event> push(byte[] chunk, int off, int len) {
    List<Event> out = new ArrayList<>();
    if (chunk == null || len <= 0) return out;
    byte[] all = new byte[leftoverLen + len];
    if (leftoverLen > 0) System.arraycopy(leftover, 0, all, 0, leftoverLen);
    System.arraycopy(chunk, off, all, leftoverLen, len);
    int keep = incompleteUtf8Suffix(all, all.length);
    int usable = all.length - keep;
    if (usable > 0) {
      String text = new String(all, 0, usable, StandardCharsets.UTF_8);
      feedChars(text, out);
    }
    if (keep > 0) {
      System.arraycopy(all, usable, leftover, 0, keep);
    }
    leftoverLen = keep;
    return out;
  }

  public List<Event> finish() {
    List<Event> out = new ArrayList<>();
    if (leftoverLen > 0) {
      String text = new String(leftover, 0, leftoverLen, StandardCharsets.UTF_8);
      leftoverLen = 0;
      feedChars(text, out);
    }
    if (line.length() > 0) {
      handleLine(line.toString(), out);
      line.setLength(0);
    }
    flushEvent(out);
    return out;
  }

  private void feedChars(String text, List<Event> out) {
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      if (c == '\r') continue;
      if (c == '\n') {
        handleLine(line.toString(), out);
        line.setLength(0);
      } else {
        line.append(c);
      }
    }
  }

  private void handleLine(String raw, List<Event> out) {
    if (raw.isEmpty()) {
      flushEvent(out);
      return;
    }
    if (raw.startsWith("event:")) {
      eventName = raw.substring(6).trim();
      return;
    }
    if (raw.startsWith("data:")) {
      String payload = raw.substring(5);
      if (payload.startsWith(" ")) payload = payload.substring(1);
      if (dataSeen) data.append('\n');
      data.append(payload);
      dataSeen = true;
    }
  }

  private void flushEvent(List<Event> out) {
    if (!dataSeen && "message".equals(eventName)) {
      resetEvent();
      return;
    }
    if (dataSeen) {
      out.add(new Event(eventName, data.toString()));
    }
    resetEvent();
  }

  private void resetEvent() {
    eventName = "message";
    data.setLength(0);
    dataSeen = false;
  }

  static int incompleteUtf8Suffix(byte[] b, int len) {
    if (len <= 0) return 0;
    int i = len - 1;
    int cont = 0;
    while (i >= 0 && (b[i] & 0xC0) == 0x80) {
      i--;
      cont++;
      if (cont == 3) break;
    }
    if (i < 0) return len;
    int lead = b[i] & 0xFF;
    int need;
    if (lead < 0x80) return 0;
    if (lead < 0xC0) return 0;
    if (lead < 0xE0) need = 2;
    else if (lead < 0xF0) need = 3;
    else if (lead < 0xF8) need = 4;
    else return 0;
    int have = len - i;
    return have < need ? have : 0;
  }
}
