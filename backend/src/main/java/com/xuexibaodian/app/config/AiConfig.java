package com.xuexibaodian.app.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(AiProperties.class)
public class AiConfig {

  @Bean
  RestClient aiRestClient(AiProperties props) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(10_000);
    int timeoutMs = Math.max(5, props.getTimeoutSeconds()) * 1000;
    factory.setReadTimeout(timeoutMs);
    return RestClient.builder().requestFactory(factory).build();
  }
}
