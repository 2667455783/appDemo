package com.xuexibaodian.app.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xuexibaodian.app.common.ApiResponse;
import com.xuexibaodian.app.entity.AppUser;
import com.xuexibaodian.app.repo.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class DeviceAuthInterceptor implements HandlerInterceptor {

  public static final String HEADER = "X-Device-Id";

  private final AppUserRepository users;
  private final ObjectMapper mapper;

  public DeviceAuthInterceptor(AppUserRepository users, ObjectMapper mapper) {
    this.users = users;
    this.mapper = mapper;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
      throws Exception {
    if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
      return true;
    }
    String deviceId = request.getHeader(HEADER);
    if (deviceId == null || deviceId.isBlank()) {
      writeFail(response, 401, "缺少请求头 X-Device-Id");
      return false;
    }
    var opt = users.findByDeviceId(deviceId.trim());
    if (opt.isEmpty()) {
      writeFail(response, 401, "设备未注册，请先调用 /api/v1/guest/bootstrap");
      return false;
    }
    DeviceContext.set(opt.get());
    return true;
  }

  @Override
  public void afterCompletion(
      HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
    DeviceContext.clear();
  }

  private void writeFail(HttpServletResponse response, int code, String message) throws Exception {
    response.setStatus(200);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    mapper.writeValue(response.getWriter(), ApiResponse.fail(code, message));
  }
}
