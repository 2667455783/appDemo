package com.xuexibaodian.app.config;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** 启动前把 backend/.env 写入系统属性（不覆盖已有环境变量） */
public final class DotenvLoader {

  private DotenvLoader() {}

  public static void load() {
    Path[] candidates = {
      Path.of(".env"),
      Path.of("backend", ".env"),
    };
    for (Path path : candidates) {
      if (Files.isRegularFile(path)) {
        loadFile(path);
        return;
      }
    }
  }

  private static void loadFile(Path path) {
    try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
      String line;
      while ((line = reader.readLine()) != null) {
        line = line.trim();
        if (line.isEmpty() || line.startsWith("#")) continue;
        int eq = line.indexOf('=');
        if (eq <= 0) continue;
        String key = line.substring(0, eq).trim();
        String value = line.substring(eq + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\""))
            || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length() - 1);
        }
        if (System.getenv(key) == null && System.getProperty(key) == null) {
          System.setProperty(key, value);
        }
      }
    } catch (IOException ignored) {
      /* 无 .env 时走环境变量 / 默认值 */
    }
  }
}
