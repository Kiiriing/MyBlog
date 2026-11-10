package com.luyu.blog.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

record ApiError(String message) {
}

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ApiError> handleApi(ApiException exception) {
		return ResponseEntity.status(exception.getStatus()).body(new ApiError(exception.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
		String message = exception.getBindingResult().getFieldErrors().stream()
				.findFirst()
				.map(error -> error.getDefaultMessage() == null ? "参数不合法" : error.getDefaultMessage())
				.orElse("参数不合法");
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(message));
	}
}
