package com.sharemarket.util;

import com.sharemarket.model.Role;

import java.time.Instant;

/** The logged-in user and role, created at login and cleared at logout. */
public final class Session {
    private final String token;
    private final int userId;
    private final Role role;
    private volatile Instant expiresAt;

    public Session(String token, int userId, Role role, Instant expiresAt) {
        this.token = token;
        this.userId = userId;
        this.role = role;
        this.expiresAt = expiresAt;
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public String getToken() {
        return token;
    }

    public int getUserId() {
        return userId;
    }

    public Role getRole() {
        return role;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    void extendTo(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
