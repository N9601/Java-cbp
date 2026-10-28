package com.sharemarket.dto;

public record ExportedFile(String filename, String contentType, byte[] content) {
}
