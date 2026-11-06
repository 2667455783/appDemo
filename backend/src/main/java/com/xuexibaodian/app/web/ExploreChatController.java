package com.xuexibaodian.app.web;

import com.xuexibaodian.app.common.ApiResponse;
import com.xuexibaodian.app.dto.ChatReplyDto;
import com.xuexibaodian.app.dto.ChatRequest;
import com.xuexibaodian.app.dto.ChatStatusDto;
import com.xuexibaodian.app.service.ExploreChatService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/explore/chat")
public class ExploreChatController {

  private final ExploreChatService service;

  public ExploreChatController(ExploreChatService service) {
    this.service = service;
  }

  @GetMapping("/status")
  public ApiResponse<ChatStatusDto> status() {
    return ApiResponse.ok(service.status());
  }

  @PostMapping
  public ApiResponse<ChatReplyDto> chat(@Valid @RequestBody ChatRequest body) {
    return ApiResponse.ok(service.chat(body));
  }
}
