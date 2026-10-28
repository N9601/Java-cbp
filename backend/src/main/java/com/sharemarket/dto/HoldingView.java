package com.sharemarket.dto;

import java.math.BigDecimal;

public record HoldingView(int stockId, String symbol, String companyName, String sector, int quantity,
                          BigDecimal avgBuyPrice, BigDecimal currentPrice, BigDecimal invested,
                          BigDecimal marketValue, BigDecimal unrealisedPnl, BigDecimal unrealisedPnlPct,
                          BigDecimal realisedPnl, BigDecimal dayChange, BigDecimal dayChangePct,
                          BigDecimal weight) {
}
