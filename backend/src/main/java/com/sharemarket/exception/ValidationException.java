package com.sharemarket.exception;

public class ValidationException extends AppException {
    public ValidationException(String message) {
        super(400, "INVALID", message);
    }
}
