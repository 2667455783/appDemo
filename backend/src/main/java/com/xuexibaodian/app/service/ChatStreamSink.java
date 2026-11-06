package com.xuexibaodian.app.service;

import java.io.IOException;

public interface ChatStreamSink {

  void onDelta(String text) throws IOException;

  default void onComplete() {}

  default boolean isCancelled() {
    return false;
  }
}
