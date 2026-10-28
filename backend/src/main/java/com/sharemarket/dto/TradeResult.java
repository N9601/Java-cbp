package com.sharemarket.dto;

import com.sharemarket.model.TxnType;

import java.math.BigDecimal;
import java.time.Instant;

/** Outcome of a committed trade. realisedPnl is null for a BUY. */
public record TradeResult(long txnId, TxnType type, String symbol, int quantity, BigDecimal price,
                          BigDecimal amount, BigDecimal balance, int holdingQuantity,
                          BigDecimal avgBuyPrice, BigDecimal realisedPnl, Instant time) {
}
