package com.sharemarket.util;

import com.sharemarket.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory session store keyed by a random token that the browser holds in
 * an HttpOnly cookie. Sessions slide forward on use and end at logout, on
 * expiry, or when an admin removes the user.
 */
@Component
public class SessionManager {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final Duration ttl;

    public SessionManager(@Value("${app.session.ttl.hours:168}") long ttlHours) {
        this.ttl = Duration.ofHours(ttlHours);
    }

    public Session create(User user) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Session session = new Session(token, user.getUserId(), user.getRole(), Instant.now().plus(ttl));
        sessions.put(token, session);
        return session;
    }

    public Optional<Session> get(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        Session session = sessions.get(token);
        if (session == null) {
            return Optional.empty();
        }
        Instant now = Instant.now();
        if (session.getExpiresAt().isBefore(now)) {
            sessions.remove(token);
            return Optional.empty();
        }
        session.extendTo(now.plus(ttl));
        return Optional.of(session);
    }

    public void invalidate(String token) {
        if (token != null) {
            sessions.remove(token);
        }
    }

    public void invalidateUser(int userId) {
        sessions.values().removeIf(s -> s.getUserId() == userId);
    }

    public Duration getTtl() {
        return ttl;
    }
}
