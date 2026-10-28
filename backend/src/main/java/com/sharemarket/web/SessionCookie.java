package com.sharemarket.web;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

/** The session token travels only in an HttpOnly, SameSite=Lax cookie. */
public final class SessionCookie {
    public static final String NAME = "ml_session";
    public static final String ATTRIBUTE = "session";

    private SessionCookie() {
    }

    public static String read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie c : cookies) {
            if (NAME.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    public static String issue(String token, Duration ttl, boolean secure) {
        return ResponseCookie.from(NAME, token).httpOnly(true).secure(secure).sameSite("Lax").path("/")
                .maxAge(ttl).build().toString();
    }

    public static String clear(boolean secure) {
        return ResponseCookie.from(NAME, "").httpOnly(true).secure(secure).sameSite("Lax").path("/")
                .maxAge(0).build().toString();
    }
}
