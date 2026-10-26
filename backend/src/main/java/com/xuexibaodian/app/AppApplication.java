package com.xuexibaodian.app;

import com.xuexibaodian.app.config.DotenvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AppApplication {

  public static void main(String[] args) {
    DotenvLoader.load();
    SpringApplication.run(AppApplication.class, args);
  }
}
