package com.sharemarket.dto;

import com.sharemarket.model.Role;
import com.sharemarket.model.User;

import java.math.BigDecimal;
import java.time.Instant;

/** The user as the API exposes it. The password hash never leaves the server. */
public record UserView(int id, String name, String email, Role role, BigDecimal balance, Instant createdAt) {

    public static UserView of(User u) {
        return new UserView(u.getUserId(), u.getName(), u.getEmail(), u.getRole(), u.getBalance(), u.getCreatedAt());
    }
}
