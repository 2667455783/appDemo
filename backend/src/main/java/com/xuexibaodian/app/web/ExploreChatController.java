package com.xuexibaodian.app.web;

import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.common.ApiResponse;
import com.xuexibaodian.app.config.AiProperties;
import com.xuexibaodian.app.dto.ChatReplyDto;
import com.xuexibaodian.app.dto.ChatRequest;
import com.xuexibaodian.app.dto.ChatStatusDto;
import com.xuexibaodian.app.service.ChatStreamSink;
import com.xuexibaodian.app.service.ExploreChatService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/me/explore/chat")
public class ExploreChatController {

  private final ExploreChatService service;
  private final AiProperties props;
  private final Executor aiStreamExecutor;

  public ExploreChatController(
      ExploreChatService service,
      AiProperties props,
      @Qualifier("aiStreamExecutor") Executor aiStreamExecutor) {
    this.service = service;
    this.props = props;
    this.aiStreamExecutor = aiStreamExecutor;
  }

  @GetMapping("/status")
  public ApiResponse<ChatStatusDto> status() {
    return ApiResponse.ok(service.status());
  }

  @PostMapping
  public ApiResponse<ChatReplyDto> chat(@Valid @RequestBody ChatRequest body) {
    return ApiResponse.ok(service.chat(body));
  }

  @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter stream(@Valid @RequestBody ChatRequest body, HttpServletResponse response) {
    service.prepare(body);
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("X-Accel-Buffering", "no");
    response.setHeader("Connection", "keep-alive");
    long timeoutMs = Math.max(15, props.getTimeoutSeconds() + 15) * 1000L;
    SseEmitter emitter = new SseEmitter(timeoutMs);
    AtomicBoolean cancelled = new AtomicBoolean(false);
    emitter.onCompletion(() -> cancelled.set(true));
    emitter.onTimeout(
        () -> {
          cancelled.set(true);
          emitter.complete();
        });
    emitter.onError((ex) -> cancelled.set(true));

    ChatStreamSink sink =
        new ChatStreamSink() {
          @Override
          public void onDelta(String text) throws IOException {
            if (cancelled.get() || text == null || text.isEmpty()) return;
            emitter.send(SseEmitter.event().name("delta").data(Map.of("text", text)));
          }

          @Override
          public void onComplete() {}

          @Override
          public boolean isCancelled() {
            return cancelled.get();
          }
        };

    aiStreamExecutor.execute(
        () -> {
          try {
            service.stream(body, sink);
            if (!cancelled.get()) {
              emitter.send(SseEmitter.event().name("done").data(Map.of("ok", true)));
              emitter.complete();
            }
          } catch (ApiException ex) {
            sendError(emitter, cancelled, ex.getMessage());
          } catch (Exception ex) {
            sendError(
                emitter,
                cancelled,
                ex.getMessage() == null ? "对话中断，请稍后重试" : ex.getMessage());
          }
        });
    return emitter;
  }

  private static void sendError(SseEmitter emitter, AtomicBoolean cancelled, String message) {
    if (cancelled.get()) return;
    try {
      emitter.send(
          SseEmitter.event().name("error").data(Map.of("message", message == null ? "对话中断" : message)));
    } catch (Exception ignored) {
      /* client gone */
    }
    try {
      emitter.complete();
    } catch (Exception ignored) {
      /* already completed */
    }
  }
}
