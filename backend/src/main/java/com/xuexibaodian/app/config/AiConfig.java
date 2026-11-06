package com.xuexibaodian.app.config;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AiProperties.class)
public class AiConfig {

  @Bean
  HttpClient aiHttpClient() {
    return HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NEVER)
        .build();
  }

  @Bean(destroyMethod = "shutdown")
  Executor aiStreamExecutor() {
    return Executors.newCachedThreadPool(
        r -> {
          Thread t = new Thread(r, "ai-stream");
          t.setDaemon(true);
          return t;
        });
  }
}
