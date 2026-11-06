package com.xuexibaodian.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.config.AiProperties;
import com.xuexibaodian.app.dto.ChatMessageDto;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class OpenAiStreamClientTest {

  private HttpServer server;

  @AfterEach
  void stop() {
    if (server != null) server.stop(0);
  }

  @Test
  void delayedChunksArriveBeforeStreamCompletes() throws Exception {
    AtomicBoolean completed = new AtomicBoolean(false);
    server =
        start(
            (body, os) -> {
              writeEvent(os, "{\"choices\":[{\"delta\":{\"role\":\"assistant\"}}]}");
              Thread.sleep(80);
              writeEvent(os, "{\"choices\":[{\"delta\":{\"content\":\"现\"}}]}");
              Thread.sleep(80);
              writeEvent(os, "{\"choices\":[{\"delta\":{\"content\":\"在完成时\"}}]}");
              writeEvent(os, "[DONE]");
            });
    List<Timed> got = new ArrayList<>();
    client()
        .stream(
            List.of(msg("user", "什么是现在完成时？")),
            recording(got, completed, new AtomicBoolean(false)));
    assertEquals(List.of("现", "在完成时"), got.stream().map(t -> t.text).toList());
    assertTrue(completed.get());
    assertTrue(got.get(1).atMs - got.get(0).atMs >= 40, "second chunk must wait for provider");
    // role-only first event must not appear as text; stream flag is asserted via follow-up test body
  }

  @Test
  void utf8SplitBySingleBytesStillYieldsChinese() throws Exception {
    server =
        start(
            (body, os) -> {
              byte[] event =
                  "data: {\"choices\":[{\"delta\":{\"content\":\"你好\"}}]}\n\ndata: [DONE]\n\n"
                      .getBytes(StandardCharsets.UTF_8);
              for (byte b : event) {
                os.write(b);
                os.flush();
              }
            });
    List<Timed> got = new ArrayList<>();
    client().stream(List.of(msg("user", "hi")), recording(got, new AtomicBoolean(), new AtomicBoolean()));
    assertEquals("你好", String.join("", got.stream().map(t -> t.text).toList()));
  }

  @Test
  void followUpSendsPriorAssistantContext() throws Exception {
    AtomicReference<String> secondBody = new AtomicReference<>();
    AtomicInteger calls = new AtomicInteger();
    server =
        start(
            (body, os) -> {
              if (calls.incrementAndGet() == 2) secondBody.set(body);
              writeEvent(os, "{\"choices\":[{\"delta\":{\"content\":\"例\"}}]}");
              writeEvent(os, "[DONE]");
            });
    OpenAiCompatibleChatCompletionClient c = client();
    c.stream(List.of(msg("user", "第一问")), recording(new ArrayList<>(), new AtomicBoolean(), new AtomicBoolean()));
    c.stream(
        List.of(msg("user", "第一问"), msg("assistant", "例"), msg("user", "再举一个")),
        recording(new ArrayList<>(), new AtomicBoolean(), new AtomicBoolean()));
    JsonNode root = new ObjectMapper().readTree(secondBody.get());
    assertTrue(root.path("stream").asBoolean());
    assertEquals(4, root.path("messages").size());
    assertEquals("assistant", root.path("messages").path(2).path("role").asText());
    assertEquals("再举一个", root.path("messages").path(3).path("content").asText());
  }

  @Test
  void cancelStopsFurtherDeltas() throws Exception {
    server =
        start(
            (body, os) -> {
              writeEvent(os, "{\"choices\":[{\"delta\":{\"content\":\"A\"}}]}");
              Thread.sleep(40);
              writeEvent(os, "{\"choices\":[{\"delta\":{\"content\":\"B\"}}]}");
              Thread.sleep(40);
              writeEvent(os, "{\"choices\":[{\"delta\":{\"content\":\"C\"}}]}");
              writeEvent(os, "[DONE]");
            });
    AtomicBoolean cancel = new AtomicBoolean(false);
    List<Timed> got = new ArrayList<>();
    client()
        .stream(
            List.of(msg("user", "x")),
            new ChatStreamSink() {
              @Override
              public void onDelta(String text) {
                got.add(new Timed(text, System.currentTimeMillis()));
                cancel.set(true);
              }

              @Override
              public boolean isCancelled() {
                return cancel.get();
              }
            });
    assertEquals(1, got.size());
    assertEquals("A", got.get(0).text);
  }

  @Test
  void providerErrorMidStreamIsNotSwallowed() throws Exception {
    server =
        start(
            (body, os) -> {
              writeEvent(os, "{\"choices\":[{\"delta\":{\"content\":\"半\"}}]}");
              writeEvent(os, "{\"error\":{\"message\":\"upstream boom\"}}");
            });
    List<String> partial = new ArrayList<>();
    ApiException ex =
        assertThrows(
            ApiException.class,
            () ->
                client()
                    .stream(
                        List.of(msg("user", "x")),
                        new ChatStreamSink() {
                          @Override
                          public void onDelta(String text) {
                            partial.add(text);
                          }
                        }));
    assertEquals(List.of("半"), partial);
    assertTrue(ex.getMessage().contains("upstream boom"));
  }

  private OpenAiCompatibleChatCompletionClient client() {
    AiProperties p = new AiProperties();
    p.setApiKey("test-key");
    p.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/v1");
    p.setModel("mock-model");
    p.setTimeoutSeconds(10);
    return new OpenAiCompatibleChatCompletionClient(p, new ObjectMapper(), HttpClient.newHttpClient());
  }

  private interface Writer {
    void write(String body, OutputStream os) throws Exception;
  }

  private HttpServer start(Writer writer) throws IOException {
    HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    s.createContext(
        "/v1/chat/completions",
        ex -> {
          byte[] raw = ex.getRequestBody().readAllBytes();
          String body = new String(raw, StandardCharsets.UTF_8);
          ex.getResponseHeaders().add("Content-Type", "text/event-stream; charset=utf-8");
          ex.sendResponseHeaders(200, 0);
          try (OutputStream os = ex.getResponseBody()) {
            writer.write(body, os);
          } catch (Throwable e) {
            throw new IOException(e);
          }
        });
    s.start();
    return s;
  }

  private static void writeEvent(OutputStream os, String data) throws IOException {
    os.write(("data: " + data + "\n\n").getBytes(StandardCharsets.UTF_8));
    os.flush();
  }

  private static ChatMessageDto msg(String role, String content) {
    ChatMessageDto m = new ChatMessageDto();
    m.setRole(role);
    m.setContent(content);
    return m;
  }

  private record Timed(String text, long atMs) {}

  private static ChatStreamSink recording(
      List<Timed> got, AtomicBoolean completed, AtomicBoolean cancelled) {
    return new ChatStreamSink() {
      @Override
      public void onDelta(String text) {
        got.add(new Timed(text, System.currentTimeMillis()));
      }

      @Override
      public void onComplete() {
        completed.set(true);
      }

      @Override
      public boolean isCancelled() {
        return cancelled.get();
      }
    };
  }
}
