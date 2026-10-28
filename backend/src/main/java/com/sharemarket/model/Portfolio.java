package com.sharemarket.model;

import com.sharemarket.service.PortfolioMath;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * A user's portfolio. Never stored: it is assembled from the wallet balance,
 * portfolio_view rows and the realised profit replayed from transactions.
 */
public class Portfolio {
    private final int userId;
    private final BigDecimal cash;
    private final List<Holding> holdings;
    private final Map<Integer, BigDecimal> realisedByStock;
    private final BigDecimal realisedPnl;

    public Portfolio(int userId, BigDecimal cash, List<Holding> holdings,
                     Map<Integer, BigDecimal> realisedByStock, BigDecimal realisedPnl) {
        this.userId = userId;
        this.cash = cash;
        this.holdings = List.copyOf(holdings);
        this.realisedByStock = Map.copyOf(realisedByStock);
        this.realisedPnl = realisedPnl;
    }

    public BigDecimal getInvested() {
        return holdings.stream().map(Holding::getInvested).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getMarketValue() {
        return holdings.stream().map(Holding::getMarketValue).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getUnrealisedPnl() {
        return holdings.stream().map(Holding::getUnrealisedPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getNetWorth() {
        return cash.add(getMarketValue());
    }

    public BigDecimal getUnrealisedPnlPercent() {
        return PortfolioMath.percent(getUnrealisedPnl(), getInvested());
    }

    public BigDecimal realisedFor(int stockId) {
        return realisedByStock.getOrDefault(stockId, BigDecimal.ZERO);
    }

    public int getUserId() {
        return userId;
    }

    public BigDecimal getCash() {
        return cash;
    }

    public List<Holding> getHoldings() {
        return holdings;
    }

    public BigDecimal getRealisedPnl() {
        return realisedPnl;
    }
}
