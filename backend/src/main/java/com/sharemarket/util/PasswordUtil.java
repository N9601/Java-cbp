package com.sharemarket.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

/**
 * SHA-256 password hashing. Each hash gets a random 16-byte salt and is
 * stored as {@code sha256$<salt hex>$<digest hex>}, so equal passwords
 * never produce equal hashes. The plain password is never stored.
 */
public final class PasswordUtil {
    private static final String SCHEME = "sha256";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final HexFormat HEX = HexFormat.of();

    private PasswordUtil() {
    }

    public static String hash(String password) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        return SCHEME + "$" + HEX.formatHex(salt) + "$" + HEX.formatHex(digest(salt, password));
    }

    public static boolean verify(String password, String stored) {
        if (password == null || stored == null) {
            return false;
        }
        String[] parts = stored.split("\\$");
        byte[] expected;
        byte[] actual;
        if (parts.length == 3 && SCHEME.equals(parts[0])) {
            expected = HEX.parseHex(parts[2]);
            actual = digest(HEX.parseHex(parts[1]), password);
        } else {
            // Unsalted SHA-256 hex, as produced by a plain MessageDigest.
            expected = HEX.parseHex(stored);
            actual = digest(new byte[0], password);
        }
        return MessageDigest.isEqual(expected, actual);
    }

    private static byte[] digest(byte[] salt, String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt);
            md.update(password.getBytes(StandardCharsets.UTF_8));
            return md.digest();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
