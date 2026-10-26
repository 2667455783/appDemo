package com.xuexibaodian.app.config;

import com.xuexibaodian.app.web.DeviceAuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  private final DeviceAuthInterceptor deviceAuthInterceptor;

  public WebMvcConfig(DeviceAuthInterceptor deviceAuthInterceptor) {
    this.deviceAuthInterceptor = deviceAuthInterceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry
        .addInterceptor(deviceAuthInterceptor)
        .addPathPatterns("/api/v1/me/**");
  }
}
