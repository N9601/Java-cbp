package com.sharemarket.dto;

import java.math.BigDecimal;
import java.util.List;

public record PortfolioSummary(BigDecimal cash, BigDecimal invested, BigDecimal marketValue,
                               BigDecimal unrealisedPnl, BigDecimal unrealisedPnlPct, BigDecimal realisedPnl,
                               BigDecimal totalPnl, BigDecimal netWorth, BigDecimal dayChange,
                               BigDecimal dayChangePct, List<HoldingView> holdings,
                               List<SectorSlice> allocation) {
}
