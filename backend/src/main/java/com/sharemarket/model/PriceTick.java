package com.sharemarket.model;

import java.math.BigDecimal;
import java.time.Instant;

/** One row of price_history, used for bulk inserts. */
public record PriceTick(int stockId, BigDecimal price, Instant time) {
}
