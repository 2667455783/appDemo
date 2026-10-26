package com.xuexibaodian.app.common;

import org.springframework.http.HttpStatus;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  @ResponseStatus(HttpStatus.OK)
  public ApiResponse<Void> handleApi(ApiException ex) {
    return ApiResponse.fail(ex.getCode(), ex.getMessage());
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    BindException.class,
    MissingRequestHeaderException.class,
    IllegalArgumentException.class
  })
  @ResponseStatus(HttpStatus.OK)
  public ApiResponse<Void> handleBadRequest(Exception ex) {
    return ApiResponse.fail(400, ex.getMessage() == null ? "请求参数错误" : ex.getMessage());
  }

  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.OK)
  public ApiResponse<Void> handleOther(Exception ex) {
    return ApiResponse.fail(500, ex.getMessage() == null ? "服务器错误" : ex.getMessage());
  }
}
