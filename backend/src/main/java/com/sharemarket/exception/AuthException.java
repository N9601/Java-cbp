package com.sharemarket.exception;

public class AuthException extends AppException {
    public AuthException(String message) {
        super(401, "UNAUTHORISED", message);
    }
}
