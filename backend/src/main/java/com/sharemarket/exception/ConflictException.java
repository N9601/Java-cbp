package com.sharemarket.exception;

public class ConflictException extends AppException {
    public ConflictException(String message) {
        super(409, "CONFLICT", message);
    }
}
