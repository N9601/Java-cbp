package com.sharemarket.web;

import com.sharemarket.exception.AppException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.sql.SQLException;
import java.sql.SQLIntegrityConstraintViolationException;

/** Turns exceptions into a small JSON body: {status, code, message}. */
@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiError> app(AppException e) {
        return body(e.getStatus(), e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> invalid(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream().findFirst()
                .map(f -> f.getDefaultMessage() == null ? f.getField() + " is invalid" : f.getDefaultMessage())
                .orElse("The request is invalid.");
        return body(400, "INVALID", message);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class})
    public ResponseEntity<ApiError> malformed(Exception e) {
        return body(400, "INVALID", "The request is malformed or has a value of the wrong type.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> method(HttpRequestMethodNotSupportedException e) {
        return body(405, "METHOD_NOT_ALLOWED", e.getMessage());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> notFound(NoResourceFoundException e) {
        return body(404, "NOT_FOUND", "Not found.");
    }

    @ExceptionHandler(SQLIntegrityConstraintViolationException.class)
    public ResponseEntity<ApiError> constraint(SQLIntegrityConstraintViolationException e) {
        log.info("Constraint violation: {}", e.getMessage());
        return body(409, "CONFLICT", "That change conflicts with existing data.");
    }

    @ExceptionHandler(SQLException.class)
    public ResponseEntity<ApiError> sql(SQLException e) {
        log.error("Database error", e);
        return body(500, "DATABASE", "A database error occurred. Your data was not changed.");
    }

    /** The browser closed an event stream; nothing to send back. */
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void clientGone() {
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> unexpected(Exception e) {
        log.error("Unexpected error", e);
        return body(500, "INTERNAL", "Something went wrong. Please try again.");
    }

    private static ResponseEntity<ApiError> body(int status, String code, String message) {
        return ResponseEntity.status(HttpStatus.valueOf(status)).body(new ApiError(status, code, message));
    }
}
