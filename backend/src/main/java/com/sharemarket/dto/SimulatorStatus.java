package com.sharemarket.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record SimulatorStatus(boolean running, int intervalSeconds, BigDecimal maxChangePercent,
                              Instant lastTickAt, long ticks) {
}
