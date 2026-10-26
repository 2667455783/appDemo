package com.xuexibaodian.app.web;

import com.xuexibaodian.app.common.ApiResponse;
import com.xuexibaodian.app.dto.BootstrapRequest;
import com.xuexibaodian.app.dto.BootstrapResponse;
import com.xuexibaodian.app.service.GuestService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/guest")
public class GuestController {

  private final GuestService guestService;

  public GuestController(GuestService guestService) {
    this.guestService = guestService;
  }

  @PostMapping("/bootstrap")
  public ApiResponse<BootstrapResponse> bootstrap(@Valid @RequestBody BootstrapRequest body) {
    return ApiResponse.ok(guestService.bootstrap(body.getDeviceId()));
  }
}
