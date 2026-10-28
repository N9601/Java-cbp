package com.sharemarket.web;

public record ApiError(int status, String code, String message) {
}
