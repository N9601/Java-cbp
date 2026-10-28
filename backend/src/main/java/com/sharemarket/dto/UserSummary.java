package com.sharemarket.dto;

import com.sharemarket.model.Role;

import java.math.BigDecimal;
import java.time.Instant;

/** A user row for the admin console, with wallet and activity totals. */
public record UserSummary(int id, String name, String email, Role role, BigDecimal balance,
                          BigDecimal holdingsValue, int holdings, long trades, Instant createdAt) {
}
